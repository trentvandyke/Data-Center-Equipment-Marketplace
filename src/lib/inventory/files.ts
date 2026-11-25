import ExcelJS from "exceljs";
import { fromSnapshotJson, fromTabularRow } from "@/lib/inventory/parse";
import type { InventoryRecord } from "@/lib/inventory/types";

function cellValue(value: ExcelJS.CellValue): unknown {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return value.result ?? "";
    if ("hyperlink" in value && typeof value.hyperlink === "string") return value.hyperlink;
  }
  return String(value);
}

export async function recordsFromUpload(filename: string, bytes: Buffer): Promise<InventoryRecord[]> {
  if (filename.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(bytes.toString("utf8")) as unknown;
    const rows = Array.isArray(parsed) ? parsed : [];
    return rows
      .map((row) => fromSnapshotJson(row as Record<string, unknown>))
      .filter((row): row is InventoryRecord => row != null);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  const sheet = workbook.getWorksheet("Listings") ?? workbook.worksheets[0];
  if (!sheet) return [];
  const headers = (sheet.getRow(1).values as ExcelJS.CellValue[]).map((value) => String(cellValue(value) ?? ""));
  const records: InventoryRecord[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const record: Record<string, unknown> = {};
    row.eachCell((cell, column) => {
      const header = headers[column];
      if (header) record[header] = cellValue(cell.value);
    });
    const parsed = fromTabularRow(record);
    if (parsed) records.push(parsed);
  });
  return records;
}
