import {
  MAX_XLSX_BYTES,
  MAX_XLSX_UNCOMPRESSED_BYTES,
} from "@/src/features/training-import/template";

const forbiddenEntries = [
  "vbaproject.bin",
  "xl/activex/",
  "xl/embeddings/",
  "xl/externallinks/",
  "customui/",
];

export class UnsafeWorkbookError extends Error {}

export function validateXlsxUpload(file: File) {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new UnsafeWorkbookError("Upload an .xlsx file created from the official template.");
  }

  if (
    file.type &&
    file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
    file.type !== "application/octet-stream"
  ) {
    throw new UnsafeWorkbookError("The uploaded file type is not supported.");
  }

  if (file.size === 0 || file.size > MAX_XLSX_BYTES) {
    throw new UnsafeWorkbookError("The workbook must be between 1 byte and 1 MB.");
  }
}

export function validateXlsxEnvelope(buffer: Buffer) {
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new UnsafeWorkbookError("The uploaded file is not a valid XLSX archive.");
  }

  const searchStart = Math.max(0, buffer.length - 65_557);
  let endOffset = -1;
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }

  if (endOffset < 0) {
    throw new UnsafeWorkbookError("The XLSX archive directory is missing.");
  }

  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);

  if (entryCount === 0 || entryCount > 200 || centralOffset + centralSize > buffer.length) {
    throw new UnsafeWorkbookError("The XLSX archive structure is outside supported limits.");
  }

  let offset = centralOffset;
  let uncompressedTotal = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new UnsafeWorkbookError("The XLSX archive directory is invalid.");
    }

    const flags = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;

    if (nameEnd > buffer.length || (flags & 0x1) !== 0) {
      throw new UnsafeWorkbookError("Encrypted or malformed XLSX entries are not supported.");
    }

    const entryName = buffer.subarray(nameStart, nameEnd).toString("utf8").toLowerCase();
    if (
      entryName.startsWith("/") ||
      entryName.includes("../") ||
      forbiddenEntries.some((forbidden) => entryName.includes(forbidden))
    ) {
      throw new UnsafeWorkbookError("The workbook contains unsupported active or external content.");
    }

    uncompressedTotal += uncompressedSize;
    if (
      uncompressedSize > 5_000_000 ||
      uncompressedTotal > MAX_XLSX_UNCOMPRESSED_BYTES ||
      (compressedSize > 0 && uncompressedSize / compressedSize > 100)
    ) {
      throw new UnsafeWorkbookError("The workbook expands beyond safe processing limits.");
    }

    offset = nameEnd + extraLength + commentLength;
  }
}
