import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildPrograceTemplateV1 } from "@/src/features/training-import/templates/prograce-template-v1";

const outputDirectory = path.join(
  process.cwd(),
  "outputs",
  "01a0a020-9aa7-75d1-9fd3-0702059e7a3c",
);
const outputPath = path.join(outputDirectory, "ProgrACE-Training-Template-v1.xlsx");

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, await buildPrograceTemplateV1());
  console.log(outputPath);
}

void main();
