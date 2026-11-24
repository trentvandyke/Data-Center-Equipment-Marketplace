import { adapters, documentedGaps } from "@/lib/crawl/adapters";
import { importInventory } from "@/lib/inventory/import";

export async function crawlSources(only?: string[]) {
  const selected = only?.length ? adapters.filter((adapter) => only.includes(adapter.id)) : adapters;
  const reports = [];
  for (const adapter of selected) {
    const result = await adapter.run();
    let imported = null;
    if (result.records.length > 0) {
      const markAbsent = result.exhaustive && process.env.CRAWL_MARK_ABSENT === "1";
      imported = await importInventory(result.records, { markAbsent });
    }
    reports.push({
      id: result.id,
      label: result.label,
      fetched: result.records.length,
      exhaustive: result.exhaustive,
      note: result.note,
      imported,
    });
  }
  return { reports, notCrawled: documentedGaps };
}
