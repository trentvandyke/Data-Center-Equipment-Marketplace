import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { importInventory } from "../src/lib/inventory/import";
import { fromSnapshotJson, fromTabularRow } from "../src/lib/inventory/parse";
import type { InventoryRecord } from "../src/lib/inventory/types";

async function recordsFromFile(file: string): Promise<InventoryRecord[]> {
  const absolute = path.resolve(file);
  if (absolute.endsWith(".json")) {
    const parsed = JSON.parse(await readFile(absolute, "utf8")) as unknown;
    const rows = Array.isArray(parsed) ? parsed : [];
    return rows
      .map((row) => fromSnapshotJson(row as Record<string, unknown>))
      .filter((row): row is InventoryRecord => row != null);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(absolute);
  const sheet = workbook.getWorksheet("Listings") ?? workbook.worksheets[0];
  if (!sheet) return [];
  const headerRow = sheet.getRow(1);
  const headers = headerRow.values as unknown[];
  const records: InventoryRecord[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const record: Record<string, unknown> = {};
    row.eachCell((cell, column) => {
      const header = headers[column];
      if (typeof header === "string") record[header] = cell.value;
    });
    const parsed = fromTabularRow(record);
    if (parsed) records.push(parsed);
  });
  return records;
}

async function main() {
  const file = process.argv[2] ?? "data/inventory/recs_2026-11-24.json";
  const records = await recordsFromFile(file);
  const report = await importInventory(records, { markAbsent: true });
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
