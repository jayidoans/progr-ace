import ExcelJS from "exceljs";

import {
  INSTRUCTIONS_SHEET,
  PROGRACE_TEMPLATE_VERSION,
  TEMPLATE_HEADERS,
  TRAINING_MENUS,
  TRAINING_PLAN_SHEET,
  WORKOUT_TYPES,
} from "@/src/features/training-import/template";

const headerFill = "3730A3";
const headerFont: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  bold: true,
  color: { argb: "FFFFFFFF" },
};

export async function buildPrograceTemplateV1() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ProgrACE";
  workbook.title = "ProgrACE Training Template v1";
  workbook.subject = "Machine-readable training prescription import";
  workbook.created = new Date("2026-01-01T00:00:00Z");
  workbook.modified = new Date("2026-01-01T00:00:00Z");

  const plan = workbook.addWorksheet(TRAINING_PLAN_SHEET, {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
  });
  plan.addRow([...TEMPLATE_HEADERS]);
  plan.getRow(1).height = 34;
  plan.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${headerFill}` } };
    cell.font = headerFont;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFFFFFFF" } } };
  });

  const widths = [8, 13, 16, 16, 17, 24, 28, 17, 18, 18, 18, 13, 18, 14, 18, 18, 32];
  plan.columns.forEach((column, index) => {
    column.width = widths[index];
  });
  plan.getColumn(2).numFmt = "yyyy-mm-dd";
  plan.autoFilter = { from: "A1", to: "Q1" };

  for (let row = 2; row <= 501; row += 1) {
    for (let column = 1; column <= TEMPLATE_HEADERS.length; column += 1) {
      const cell = plan.getCell(row, column);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
      cell.font = { name: "Arial", size: 10, color: { argb: "FF111827" } };
      cell.alignment = { vertical: "middle" };
    }
    plan.getCell(row, 1).dataValidation = { type: "whole", operator: "between", formulae: [1, 52], allowBlank: false };
    plan.getCell(row, 5).dataValidation = { type: "list", formulae: [`"${TRAINING_MENUS.join(",")}"`], allowBlank: false };
    plan.getCell(row, 8).dataValidation = { type: "whole", operator: "between", formulae: [1, 20], allowBlank: false };
    plan.getCell(row, 9).dataValidation = { type: "list", formulae: [`"${WORKOUT_TYPES.join(",")}"`], allowBlank: false };
    plan.getCell(row, 12).dataValidation = { type: "whole", operator: "between", formulae: [1, 1000], allowBlank: true };
  }

  const instructions = workbook.addWorksheet(INSTRUCTIONS_SHEET, {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
  });
  instructions.getCell("A1").value = "PROGRACE_TEMPLATE_VERSION";
  instructions.getCell("B1").value = PROGRACE_TEMPLATE_VERSION;
  instructions.getCell("A3").value = "ProgrACE Training Template";
  instructions.getCell("A4").value = "Use Training Plan for import. Leave rest days blank; never add REST rows.";
  instructions.getCell("A6").value = "Rule";
  instructions.getCell("B6").value = "Accepted values or format";
  const rules = [
    ["Required columns", "Week, Date, Phase, Session, Training Menu, Title, Component Order, Workout Type"],
    ["Training Menu", TRAINING_MENUS.join(", ")],
    ["Workout Type", WORKOUT_TYPES.join(", ")],
    ["Distance", "Explicit unit: 5 km, 400 m, or 42.195 km"],
    ["Duration / Recovery", "Positive seconds, HH:MM:SS, MM:SS, 20 min, or 20'"],
    ["Target pace", "MM:SS per km, such as 05:30"],
  ];
  rules.forEach(([rule, value], index) => {
    instructions.getCell(7 + index, 1).value = rule;
    instructions.getCell(7 + index, 2).value = value;
  });
  instructions.getCell("A13").value = "Examples only — do not copy these rows into Training Plan unless intended";
  instructions.getRow(14).values = [...TEMPLATE_HEADERS];
  const examples = [
    [1, "2026-07-20", "Build 1", "W1-EASY", "EASY", "Easy Run", null, 1, "EASY", "5 km", null, null, null, null, null, null, "Easy Run"],
    [1, "2026-07-22", "Build 1", "W1-SPEED", "SPEED", "Speed Session", null, 1, "INTERVAL", null, null, 8, "400 m", "90 sec", null, null, "8 x 400 m"],
    [1, "2026-07-23", "Build 1", "W1-STRENGTH", "STRENGTH", "Strength Training", null, 1, "STRENGTH", null, null, null, null, null, null, null, "Strength Training"],
    [1, "2026-07-25", "Build 1", "W1-LONG", "LONG", "Long Run", null, 1, "LONG", "14 km", null, null, null, null, null, null, "Long Run"],
    [2, "2026-07-27", "Build 2", "W2-COMPOSITE", "SPEED", "Composite Tempo", null, 1, "EASY", "3 km", null, null, null, null, null, null, "Warm-up"],
    [2, "2026-07-27", "Build 2", "W2-COMPOSITE", "SPEED", "Composite Tempo", null, 2, "TEMPO", "8 km", null, null, null, null, "04:45", "05:00", "Tempo"],
    [2, "2026-07-27", "Build 2", "W2-COMPOSITE", "SPEED", "Composite Tempo", null, 3, "EASY", "3 km", null, null, null, null, null, null, "Cool-down"],
  ];
  examples.forEach((example) => instructions.addRow(example));

  instructions.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${headerFill}` } };
    cell.font = headerFont;
  });
  instructions.getCell("A3").font = { name: "Arial", size: 16, bold: true, color: { argb: "FF111827" } };
  instructions.getCell("A4").font = { name: "Arial", size: 10, italic: true, color: { argb: "FF4B5563" } };
  [6, 14].forEach((rowNumber) => {
    instructions.getRow(rowNumber).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber === 6 ? `FF${headerFill}` : "FF4F46E5" } };
      cell.font = headerFont;
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  });
  instructions.getCell("A13").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
  instructions.getCell("A13").font = { name: "Arial", size: 10, bold: true, color: { argb: "FF92400E" } };
  instructions.getColumn(1).width = 34;
  instructions.getColumn(2).width = 72;
  widths.slice(2).forEach((width, index) => {
    instructions.getColumn(index + 3).width = width;
  });
  instructions.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { ...cell.alignment, vertical: "middle" };
    });
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
