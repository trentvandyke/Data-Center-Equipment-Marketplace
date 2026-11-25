"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { importSnapshotFile } from "@/actions/import-inventory";
import type { ActionState } from "@/lib/types";

export function AdminImport() {
  const [state, action] = useActionState(importSnapshotFile, {} as ActionState);
  return (
    <form action={action} className="panel grid gap-3 p-4">
      <p className="font-serif text-xl">Load a daily snapshot</p>
      <p className="text-sm text-muted">
        JSON or the Listings workbook. Rows are matched on the source URL. Listings from those sites that are missing in the file are marked stale.
      </p>
      <input name="snapshot" type="file" accept="application/json,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx" required className="text-sm" />
      <ImportButton />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-pine">{state.success}</p> : null}
    </form>
  );
}

function ImportButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary w-fit" disabled={pending}>
      {pending ? "Importing…" : "Import snapshot"}
    </button>
  );
}
