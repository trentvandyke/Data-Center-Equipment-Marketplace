"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { recordsFromUpload } from "@/lib/inventory/files";
import { importInventory } from "@/lib/inventory/import";
import type { ActionState } from "@/lib/types";

export async function importSnapshotFile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = formData.get("snapshot");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a JSON or Excel file." };
  if (file.size > 20 * 1024 * 1024) return { error: "That file is larger than 20 MB." };
  try {
    const records = await recordsFromUpload(file.name, Buffer.from(await file.arrayBuffer()));
    const report = await importInventory(records, { markAbsent: true });
    revalidatePath("/");
    revalidatePath("/listings");
    revalidatePath("/admin");
    return {
      success: `Imported ${report.unique} rows: ${report.created} new, ${report.updated} changed, ${report.unchanged} unchanged, ${report.markedStale} marked stale.`,
    };
  } catch (error) {
    console.error(error);
    return { error: "Could not read that file. Use the snapshot JSON or the Listings workbook." };
  }
}
