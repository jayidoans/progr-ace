import ExcelJS from "exceljs";
import JSZip from "jszip";

import {
  INSTRUCTIONS_SHEET,
  MAX_TEMPLATE_ROWS,
  PROGRACE_TEMPLATE_VERSION,
  TEMPLATE_HEADERS,
  TRAINING_MENUS,
  TRAINING_PLAN_SHEET,
  WORKOUT_TYPES,
} from "@/src/features/training-import/template";
import type {
  ImportIssue,
  NormalizedComponent,
  NormalizedPrescription,
  NormalizedTrainingPlan,
  NormalizedWeek,
  TrainingMenu,
  TrainingTemplateParseResult,
  WorkoutType,
} from "@/src/features/training-import/types";

type CellValue = ExcelJS.CellValue;

const spreadsheetMainNamespace =
  "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

async function normalizePrefixedSpreadsheetXml(buffer: Buffer) {
  const archive = await JSZip.loadAsync(buffer);
  let changed = false;

  await Promise.all(
    Object.values(archive.files).map(async (entry) => {
      if (entry.dir || !entry.name.startsWith("xl/") || !entry.name.endsWith(".xml")) {
        return;
      }

      const xml = await entry.async("string");
      const namespace = `xmlns:x="${spreadsheetMainNamespace}"`;
      if (!xml.includes(namespace)) return;

      archive.file(
        entry.name,
        xml
          .replace(
            namespace,
            `xmlns="${spreadsheetMainNamespace}" ${namespace}`,
          )
          .replace(/<(\/?)x:/g, "<$1"),
      );
      changed = true;
    }),
  );

  if (!changed) return null;
  return Buffer.from(await archive.generateAsync({ type: "uint8array" }));
}

async function loadWorkbook(workbook: ExcelJS.Workbook, buffer: Buffer) {
  try {
    await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  } catch (originalError) {
    const normalized = await normalizePrefixedSpreadsheetXml(buffer);
    if (!normalized) throw originalError;
    await workbook.xlsx.load(Uint8Array.from(normalized).buffer);
  }
}

function isFormula(value: CellValue) {
  return Boolean(value && typeof value === "object" && "formula" in value);
}

function textValue(value: CellValue) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map((part) => part.text).join("").trim();
  }
  return "";
}

function parsePositiveInteger(value: CellValue, label: string, row: number, required = false) {
  const text = textValue(value);
  if (!text && !required) return null;
  const number = Number(text);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${label} must be a positive whole number at row ${row}.`);
  }
  return number;
}

export function parseDistanceMeters(value: CellValue, label = "Distance") {
  const text = textValue(value).toLowerCase();
  if (!text) return null;
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(km|m)$/);
  if (!match) throw new Error(`${label} requires an explicit m or km unit.`);
  const amount = Number(match[1]);
  const meters = Math.round(amount * (match[2] === "km" ? 1000 : 1));
  if (!Number.isInteger(meters) || meters <= 0 || meters > 1_000_000) {
    throw new Error(`${label} must resolve to a positive whole-meter value.`);
  }
  return meters;
}

export function parseDurationSeconds(value: CellValue, label = "Duration") {
  const text = textValue(value).toLowerCase();
  if (!text) return null;
  if (/^\d+$/.test(text)) {
    const seconds = Number(text);
    if (seconds > 0) return seconds;
  }
  const clock = text.match(/^(\d{1,3}):([0-5]\d)(?::([0-5]\d))?$/);
  if (clock) {
    const first = Number(clock[1]);
    const second = Number(clock[2]);
    const third = clock[3] ? Number(clock[3]) : null;
    const seconds = third === null ? first * 60 + second : first * 3600 + second * 60 + third;
    if (seconds > 0) return seconds;
  }
  const minutes = text.match(/^(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes|')$/);
  if (minutes) return Math.round(Number(minutes[1]) * 60);
  const seconds = text.match(/^(\d+)\s*(?:sec|secs|second|seconds|s)$/);
  if (seconds && Number(seconds[1]) > 0) return Number(seconds[1]);
  throw new Error(`${label} must use seconds, HH:MM:SS, MM:SS, or a minute suffix.`);
}

export function parsePaceSeconds(value: CellValue, label = "Target pace") {
  const text = textValue(value).toLowerCase().replace(/\s*\/\s*km$/, "");
  if (!text) return null;
  if (/^\d+$/.test(text) && Number(text) > 0) return Number(text);
  const match = text.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) throw new Error(`${label} must use MM:SS per kilometer.`);
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseDate(value: CellValue, row: number) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }
  const text = textValue(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`Date must use YYYY-MM-DD at row ${row}.`);
  }
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== text) {
    throw new Error(`Date is invalid at row ${row}.`);
  }
  return text;
}

function weekBounds(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  const mondayOffset = (parsed.getUTCDay() + 6) % 7;
  const start = new Date(parsed);
  start.setUTCDate(start.getUTCDate() - mondayOffset);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export async function parsePrograceTemplateV1(
  buffer: Buffer,
  program: { name: string; description: string | null },
): Promise<TrainingTemplateParseResult> {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const workbook = new ExcelJS.Workbook();

  try {
    await loadWorkbook(workbook, buffer);
  } catch {
    return {
      status: "ERROR",
      plan: null,
      warnings,
      errors: [{ level: "ERROR", message: "The XLSX workbook could not be opened." }],
    };
  }

  const names = workbook.worksheets.map((sheet) => sheet.name);
  if (
    names.length !== 2 ||
    !names.includes(TRAINING_PLAN_SHEET) ||
    !names.includes(INSTRUCTIONS_SHEET)
  ) {
    errors.push({ level: "ERROR", message: "The workbook must contain only Training Plan and Instructions sheets." });
  }

  const instructions = workbook.getWorksheet(INSTRUCTIONS_SHEET);
  const planSheet = workbook.getWorksheet(TRAINING_PLAN_SHEET);
  const version = instructions ? Number(textValue(instructions.getCell("B1").value)) : Number.NaN;
  const marker = instructions ? textValue(instructions.getCell("A1").value) : "";

  if (marker !== "PROGRACE_TEMPLATE_VERSION" || version !== PROGRACE_TEMPLATE_VERSION) {
    errors.push({ level: "ERROR", message: "Unsupported ProgrACE template version." });
  }

  if (!planSheet) {
    errors.push({ level: "ERROR", message: "Training Plan sheet is missing." });
  }

  if (errors.length > 0 || !planSheet) {
    return { status: "ERROR", plan: null, warnings, errors };
  }

  if (planSheet.columnCount > TEMPLATE_HEADERS.length || planSheet.rowCount > MAX_TEMPLATE_ROWS + 1) {
    errors.push({ level: "ERROR", message: "The Training Plan sheet exceeds supported row or column limits." });
  }

  const actualHeaders = TEMPLATE_HEADERS.map((_, index) => textValue(planSheet.getCell(1, index + 1).value));
  if (actualHeaders.some((header, index) => header !== TEMPLATE_HEADERS[index])) {
    errors.push({ level: "ERROR", message: "Training Plan headers do not match template version 1." });
  }

  const sessions = new Map<
    string,
    { weekNumber: number; phase: string; prescription: NormalizedPrescription; row: number }
  >();

  for (let rowNumber = 2; rowNumber <= planSheet.rowCount; rowNumber += 1) {
    const row = planSheet.getRow(rowNumber);
    const values = TEMPLATE_HEADERS.map((_, index) => row.getCell(index + 1).value);
    if (values.every((value) => textValue(value) === "")) continue;

    if (values.some(isFormula)) {
      errors.push({ level: "ERROR", row: rowNumber, message: "Formula cells are not accepted as import data." });
      continue;
    }

    try {
      const weekNumber = parsePositiveInteger(values[0], "Week", rowNumber, true)!;
      const scheduledDate = parseDate(values[1], rowNumber);
      const phase = textValue(values[2]);
      const session = textValue(values[3]);
      const trainingMenu = textValue(values[4]).toUpperCase();
      const title = textValue(values[5]);
      const description = textValue(values[6]) || null;
      const sequenceOrder = parsePositiveInteger(values[7], "Component Order", rowNumber, true)!;
      const componentType = textValue(values[8]).toUpperCase();

      if (!phase || !session || !title) throw new Error(`Phase, Session, and Title are required at row ${rowNumber}.`);
      if (!TRAINING_MENUS.includes(trainingMenu as TrainingMenu)) {
        throw new Error(`Unknown Training Menu at row ${rowNumber}.`);
      }
      if (!WORKOUT_TYPES.includes(componentType as WorkoutType)) {
        throw new Error(`Unknown Workout Type at row ${rowNumber}.`);
      }

      const component: NormalizedComponent = {
        sequenceOrder,
        componentType: componentType as WorkoutType,
        targetDistanceM: parseDistanceMeters(values[9], "Target Distance"),
        targetDurationSec: parseDurationSeconds(values[10], "Target Duration"),
        repetitions: parsePositiveInteger(values[11], "Repetitions", rowNumber),
        distancePerRepM: parseDistanceMeters(values[12], "Distance Per Rep"),
        recoveryDurationSec: parseDurationSeconds(values[13], "Recovery"),
        targetPaceMinSecPerKm: parsePaceSeconds(values[14], "Target Pace Min"),
        targetPaceMaxSecPerKm: parsePaceSeconds(values[15], "Target Pace Max"),
        instruction: textValue(values[16]) || null,
      };

      if (
        component.targetDistanceM === null &&
        component.targetDurationSec === null &&
        component.repetitions === null &&
        component.distancePerRepM === null &&
        component.recoveryDurationSec === null &&
        component.targetPaceMinSecPerKm === null &&
        component.targetPaceMaxSecPerKm === null &&
        component.instruction === null
      ) {
        throw new Error(`Workout component has no structured target or instruction at row ${rowNumber}.`);
      }
      if (
        component.targetPaceMinSecPerKm !== null &&
        component.targetPaceMaxSecPerKm !== null &&
        component.targetPaceMinSecPerKm > component.targetPaceMaxSecPerKm
      ) {
        throw new Error(`Target Pace Min must not exceed Target Pace Max at row ${rowNumber}.`);
      }

      const key = `${weekNumber}:${session}`;
      const existing = sessions.get(key);
      if (existing) {
        if (
          existing.phase !== phase ||
          existing.prescription.scheduledDate !== scheduledDate ||
          existing.prescription.trainingMenu !== trainingMenu ||
          existing.prescription.title !== title ||
          existing.prescription.description !== description
        ) {
          throw new Error(`Repeated Session values must use matching prescription fields at row ${rowNumber}.`);
        }
        if (existing.prescription.components.some((item) => item.sequenceOrder === sequenceOrder)) {
          throw new Error(`Component Order is duplicated within Session ${session} at row ${rowNumber}.`);
        }
        existing.prescription.components.push(component);
      } else {
        sessions.set(key, {
          weekNumber,
          phase,
          row: rowNumber,
          prescription: {
            session,
            scheduledDate,
            trainingMenu: trainingMenu as TrainingMenu,
            title,
            description,
            components: [component],
          },
        });
      }
    } catch (error) {
      errors.push({
        level: "ERROR",
        row: rowNumber,
        message: error instanceof Error ? error.message : `Row ${rowNumber} is invalid.`,
      });
    }
  }

  if (sessions.size === 0) {
    errors.push({ level: "ERROR", message: "Training Plan must contain at least one prescription row." });
  }

  if (errors.length > 0) return { status: "ERROR", plan: null, warnings, errors };

  const weekMap = new Map<number, NormalizedWeek>();
  for (const { weekNumber, phase, prescription, row } of sessions.values()) {
    prescription.components.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const bounds = weekBounds(prescription.scheduledDate);
    const week = weekMap.get(weekNumber);
    if (week) {
      if (week.phase !== phase || week.startDate !== bounds.startDate) {
        errors.push({ level: "ERROR", row, message: `Week ${weekNumber} spans inconsistent phases or calendar weeks.` });
        continue;
      }
      week.prescriptions.push(prescription);
    } else {
      weekMap.set(weekNumber, {
        weekNumber,
        phase,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
        prescriptions: [prescription],
      });
    }

    if (
      prescription.components.some(
        (component) => component.instruction?.toLowerCase().includes("strides"),
      ) &&
      !prescription.components.some((component) => component.componentType === "STRIDES")
    ) {
      warnings.push({
        level: "WARNING",
        row,
        message: `${prescription.title} mentions Strides without a dedicated STRIDES component.`,
      });
    }
    if (prescription.components.some((component) => component.componentType === "OTHER")) {
      warnings.push({ level: "WARNING", row, message: `${prescription.title} uses OTHER and needs coach review.` });
    }
  }

  if (errors.length > 0) return { status: "ERROR", plan: null, warnings, errors };

  const weeks = [...weekMap.values()].sort((a, b) => a.weekNumber - b.weekNumber);
  weeks.forEach((week) => week.prescriptions.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)));
  const plan: NormalizedTrainingPlan = {
    templateVersion: 1,
    name: program.name,
    description: program.description,
    startDate: weeks[0].startDate,
    endDate: weeks.at(-1)!.endDate,
    weeks,
  };

  return {
    status: warnings.length > 0 ? "WARNING" : "VALID",
    plan,
    warnings,
    errors,
  };
}
