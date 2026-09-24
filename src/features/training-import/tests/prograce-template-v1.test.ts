import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import ExcelJS from "exceljs";
import JSZip from "jszip";

import {
  parseDistanceMeters,
  parseDurationSeconds,
  parsePrograceTemplateV1,
} from "@/src/features/training-import/parsers/prograce-template-v1";
import {
  UnsafeWorkbookError,
  validateXlsxEnvelope,
} from "@/src/features/training-import/security";
import {
  INSTRUCTIONS_SHEET,
  PROGRACE_TEMPLATE_VERSION,
  TEMPLATE_HEADERS,
  TRAINING_PLAN_SHEET,
} from "@/src/features/training-import/template";

type TemplateRow = Array<string | number | Date | null>;

const templatePath = path.join(
  process.cwd(),
  "outputs",
  "01a0a020-9aa7-75d1-9fd3-0702059e7a3c",
  "ProgrACE-Training-Template-v1.xlsx",
);

function baseRow(overrides: Partial<Record<(typeof TEMPLATE_HEADERS)[number], string | number | Date | null>> = {}) {
  const values: Record<(typeof TEMPLATE_HEADERS)[number], string | number | Date | null> = {
    Week: 1,
    Date: "2026-07-20",
    Phase: "Build 1",
    Session: "S1",
    "Training Menu": "EASY",
    Title: "Easy Run",
    Description: null,
    "Component Order": 1,
    "Workout Type": "EASY",
    "Target Distance": "5 km",
    "Target Duration": null,
    Repetitions: null,
    "Distance Per Rep": null,
    Recovery: null,
    "Target Pace Min": null,
    "Target Pace Max": null,
    Instruction: "Easy effort",
    ...overrides,
  };
  return TEMPLATE_HEADERS.map((header) => values[header]);
}

async function workbookBuffer(rows: TemplateRow[], version = PROGRACE_TEMPLATE_VERSION, headers = [...TEMPLATE_HEADERS]) {
  const workbook = new ExcelJS.Workbook();
  const plan = workbook.addWorksheet(TRAINING_PLAN_SHEET);
  plan.addRow(headers);
  rows.forEach((row) => plan.addRow(row));
  const instructions = workbook.addWorksheet(INSTRUCTIONS_SHEET);
  instructions.getCell("A1").value = "PROGRACE_TEMPLATE_VERSION";
  instructions.getCell("B1").value = version;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function parseRows(rows: TemplateRow[], version = 1, headers = [...TEMPLATE_HEADERS]) {
  return parsePrograceTemplateV1(await workbookBuffer(rows, version, headers), {
    name: "Test Program",
    description: "Parser fixture",
  });
}

async function prefixedSpreadsheetXmlBuffer(rows: TemplateRow[]) {
  const archive = await JSZip.loadAsync(await workbookBuffer(rows));
  const namespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

  await Promise.all(
    Object.values(archive.files).map(async (entry) => {
      if (entry.dir || !entry.name.startsWith("xl/") || !entry.name.endsWith(".xml")) {
        return;
      }

      const xml = await entry.async("string");
      const defaultNamespace = `xmlns="${namespace}"`;
      if (!xml.includes(defaultNamespace)) return;

      archive.file(
        entry.name,
        xml
          .replace(defaultNamespace, `xmlns:x="${namespace}"`)
          .replace(/<(\/?)(?![A-Za-z_][\w.-]*:)([A-Za-z_][\w.-]*)(?=[\s/>])/g, "<$1x:$2"),
      );
    }),
  );

  return Buffer.from(await archive.generateAsync({ type: "uint8array" }));
}

test("official download artifact is a valid, versioned XLSX with stable headers", async () => {
  const bytes = await readFile(templatePath);
  assert.ok(bytes.length > 0);
  assert.doesNotThrow(() => validateXlsxEnvelope(bytes));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(bytes).buffer);
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), [TRAINING_PLAN_SHEET, INSTRUCTIONS_SHEET]);
  assert.deepEqual(
    TEMPLATE_HEADERS.map((_, index) => String(workbook.getWorksheet(TRAINING_PLAN_SHEET)!.getCell(1, index + 1).value)),
    [...TEMPLATE_HEADERS],
  );
  assert.equal(workbook.getWorksheet(INSTRUCTIONS_SHEET)!.getCell("A1").value, "PROGRACE_TEMPLATE_VERSION");
  assert.equal(workbook.getWorksheet(INSTRUCTIONS_SHEET)!.getCell("B1").value, 1);
});

test("archive preflight rejects non-XLSX input before workbook decompression", () => {
  assert.throws(() => validateXlsxEnvelope(Buffer.from("not an xlsx archive")), UnsafeWorkbookError);
});

test("valid prefixed SpreadsheetML namespaces are normalized before parsing", async () => {
  const result = await parsePrograceTemplateV1(
    await prefixedSpreadsheetXmlBuffer([baseRow()]),
    { name: "Prefixed workbook", description: null },
  );

  assert.equal(result.status, "VALID");
  assert.equal(result.plan?.weeks[0].prescriptions[0].title, "Easy Run");
});

test("canonical distance and duration formats convert without floating storage", () => {
  assert.equal(parseDistanceMeters("5 km"), 5000);
  assert.equal(parseDistanceMeters("42.195 km"), 42195);
  assert.equal(parseDistanceMeters("400 m"), 400);
  assert.equal(parseDurationSeconds("20'"), 1200);
  assert.equal(parseDurationSeconds("01:30:00"), 5400);
});

test("valid menus can use different weekdays, optional MEDIUM, and omitted rest rows", async () => {
  const rows = [
    baseRow({ Date: "2026-07-20", Session: "easy", "Training Menu": "EASY" }),
    baseRow({ Date: "2026-07-21", Session: "strength", "Training Menu": "STRENGTH", Title: "Strength", "Workout Type": "STRENGTH", "Target Distance": null, Instruction: "Strength Training" }),
    baseRow({ Date: "2026-07-23", Session: "speed", "Training Menu": "SPEED", Title: "Tempo", "Workout Type": "TEMPO", "Target Distance": null, "Target Duration": "20'" }),
    baseRow({ Date: "2026-07-25", Session: "long", "Training Menu": "LONG", Title: "Long Run", "Workout Type": "LONG", "Target Distance": "14 km" }),
  ];
  const result = await parseRows(rows);
  assert.equal(result.status, "VALID");
  assert.equal(result.plan!.weeks[0].prescriptions.length, 4);
  assert.deepEqual(result.plan!.weeks[0].prescriptions.map((item) => item.scheduledDate), ["2026-07-20", "2026-07-21", "2026-07-23", "2026-07-25"]);
  assert.equal(result.plan!.weeks[0].prescriptions.some((item) => item.trainingMenu === "MEDIUM"), false);

  const withMedium = await parseRows([...rows, baseRow({ Date: "2026-07-24", Session: "medium", "Training Menu": "MEDIUM", Title: "Medium Run", "Workout Type": "MEDIUM", "Target Distance": "8 km" })]);
  assert.equal(withMedium.status, "VALID");
  assert.equal(withMedium.plan!.weeks[0].prescriptions.some((item) => item.trainingMenu === "MEDIUM"), true);
});

test("historical training dates remain valid for mid-program adoption", async () => {
  const result = await parseRows([
    baseRow({ Week: 14, Date: "2026-09-22", Phase: "Taper", Session: "historical", Title: "Week 14 run" }),
  ]);
  assert.equal(result.status, "VALID");
  assert.equal(result.plan?.startDate, "2026-09-21");
  assert.equal(result.plan?.weeks[0].prescriptions[0].scheduledDate, "2026-09-22");
});

test("8 x 400m and composite sessions preserve ordered structured details", async () => {
  const result = await parseRows([
    baseRow({ Date: "2026-07-23", Session: "intervals", "Training Menu": "SPEED", Title: "8 x 400 m", "Workout Type": "INTERVAL", "Target Distance": null, Repetitions: 8, "Distance Per Rep": "400 m", Recovery: "90 s", Instruction: "Controlled repetitions" }),
    baseRow({ Date: "2026-07-25", Session: "composite", "Training Menu": "SPEED", Title: "Progression", "Component Order": 1, "Workout Type": "EASY", "Target Distance": "3 km", Instruction: "Warm-up" }),
    baseRow({ Date: "2026-07-25", Session: "composite", "Training Menu": "SPEED", Title: "Progression", "Component Order": 2, "Workout Type": "TEMPO", "Target Distance": "8 km", "Target Pace Min": "04:45", "Target Pace Max": "05:00", Instruction: "Tempo block" }),
    baseRow({ Date: "2026-07-25", Session: "composite", "Training Menu": "SPEED", Title: "Progression", "Component Order": 3, "Workout Type": "EASY", "Target Distance": "3 km", Instruction: "Cool-down" }),
  ]);
  assert.equal(result.status, "VALID");
  const interval = result.plan!.weeks[0].prescriptions[0].components[0];
  assert.equal(interval.repetitions, 8);
  assert.equal(interval.distancePerRepM, 400);
  assert.equal(interval.recoveryDurationSec, 90);
  const composite = result.plan!.weeks[0].prescriptions[1];
  assert.deepEqual(composite.components.map((item) => item.sequenceOrder), [1, 2, 3]);
  assert.deepEqual(composite.components.map((item) => item.instruction), ["Warm-up", "Tempo block", "Cool-down"]);
});

test("Strides without a dedicated component is a review warning", async () => {
  const result = await parseRows([baseRow({ Instruction: "6 km Easy + Strides", "Target Distance": "6 km" })]);
  assert.equal(result.status, "WARNING");
  assert.match(result.warnings[0].message, /Strides/);
});

test("unsupported version, missing headers, invalid date, and unknown menu are errors", async () => {
  assert.equal((await parseRows([baseRow()], 2)).status, "ERROR");
  assert.equal((await parseRows([baseRow()], 1, TEMPLATE_HEADERS.slice(0, -1))).status, "ERROR");
  assert.equal((await parseRows([baseRow({ Date: "2026-02-31" })])).status, "ERROR");
  assert.equal((await parseRows([baseRow({ "Training Menu": "REST" })])).status, "ERROR");
});

test("HTML-looking workbook text remains plain import data and oversized text is rejected", async () => {
  const literalText = await parseRows([
    baseRow({
      Title: "<script>alert(1)</script>",
      Instruction: '<img src=x onerror=alert(1)>',
    }),
  ]);
  assert.equal(literalText.status, "VALID");
  assert.equal(literalText.plan?.weeks[0].prescriptions[0].title, "<script>alert(1)</script>");

  const oversized = await parseRows([baseRow({ Title: "x".repeat(161) })]);
  assert.equal(oversized.status, "ERROR");
  assert.match(oversized.errors[0].message, /Title must contain at most 160 characters/);
});

test("negative/ambiguous values and formulas are rejected, never guessed or executed", async () => {
  assert.throws(() => parseDistanceMeters("-5 km"));
  assert.throws(() => parseDistanceMeters("5"));
  const formulaRow = baseRow();
  formulaRow[9] = { formula: "2+3", result: 5 } as never;
  const result = await parseRows([formulaRow]);
  assert.equal(result.status, "ERROR");
  assert.match(result.errors[0].message, /Formula/);
});
