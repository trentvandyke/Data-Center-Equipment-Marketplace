"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { extractRequirements, saveMatchRun, type ExtractState } from "@/actions/match";
import { categories, manufacturers } from "@/lib/catalog";
import type { EquipmentNeed } from "@/lib/match/types";

const emptyNeed = (): EquipmentNeed => ({
  label: "",
  category: "",
  voltage: "",
  kw: null,
  kva: null,
  amps: null,
  phase: null,
  quantity: 1,
  manufacturer: null,
  configuration: "",
  notes: "",
});

export function RequirementTool() {
  const [extracted, extractAction] = useActionState(extractRequirements, {} as ExtractState);
  const [matched, matchAction] = useActionState(saveMatchRun, {});
  const [items, setItems] = useState<EquipmentNeed[] | null>(null);
  const [appliedExtract, setAppliedExtract] = useState(extracted.items);
  if (extracted.items !== appliedExtract) {
    setAppliedExtract(extracted.items);
    setItems(extracted.items ?? null);
  }
  const lines = items ?? [];

  function update(index: number, patch: Partial<EquipmentNeed>) {
    setItems(lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  return (
    <div className="panel p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-copper">Match a one-line</p>
      <h2 className="mt-1 font-serif text-2xl">What does the diagram call for?</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Upload a single-line PDF or image, or paste the gear you need. Edit the lines, then match them to inventory.
      </p>
      <form action={extractAction} className="mt-4 grid gap-3">
        <label>
          <span className="label">Description</span>
          <textarea
            name="description"
            className="field"
            placeholder="Two 2500 kVA pad-mount transformers, 12.47 kV to 480Y/277 V, and a 1500 kW 480 V generator."
          />
        </label>
        <label>
          <span className="label">Single-line PDF or image</span>
          <input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="block w-full text-sm" />
        </label>
        <ExtractButton />
        {extracted.error ? <p className="text-sm text-danger">{extracted.error}</p> : null}
        {extracted.warning ? <p className="text-sm text-muted">{extracted.warning}</p> : null}
      </form>

      <form action={matchAction} className="mt-4 grid gap-3">
        <input type="hidden" name="items" value={JSON.stringify(lines.filter((line) => line.label.trim()))} />
        {lines.map((line, index) => (
          <div key={`${line.label}-${index}`} className="grid gap-2 rounded-lg border border-line p-3">
            <input
              className="field"
              value={line.label}
              aria-label={`Line ${index + 1} description`}
              onChange={(event) => update(index, { label: event.target.value })}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select className="field" value={line.category} aria-label="Category" onChange={(event) => update(index, { category: event.target.value })}>
                <option value="">Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
              <input className="field" value={line.voltage} aria-label="Voltage" placeholder="Voltage" onChange={(event) => update(index, { voltage: event.target.value })} />
              <input className="field" value={line.kva ?? ""} aria-label="kVA" placeholder="kVA" inputMode="decimal" onChange={(event) => update(index, { kva: event.target.value ? Number(event.target.value) : null })} />
              <input className="field" value={line.kw ?? ""} aria-label="kW" placeholder="kW" inputMode="decimal" onChange={(event) => update(index, { kw: event.target.value ? Number(event.target.value) : null })} />
              <input className="field" value={line.amps ?? ""} aria-label="Amps" placeholder="Amps" inputMode="decimal" onChange={(event) => update(index, { amps: event.target.value ? Number(event.target.value) : null })} />
              <input className="field" value={line.quantity ?? ""} aria-label="Quantity" placeholder="Qty" inputMode="numeric" onChange={(event) => update(index, { quantity: event.target.value ? Number(event.target.value) : null })} />
              <input className="field" list="need-manufacturers" value={line.manufacturer ?? ""} aria-label="Manufacturer" placeholder="Manufacturer" onChange={(event) => update(index, { manufacturer: event.target.value || null })} />
              <input className="field" value={line.configuration ?? ""} aria-label="Configuration" placeholder="Indoor, NEMA 3R, pad-mount" onChange={(event) => update(index, { configuration: event.target.value })} />
            </div>
            <button type="button" className="text-left text-xs text-danger" onClick={() => setItems(lines.filter((_, lineIndex) => lineIndex !== index))}>
              Remove line
            </button>
          </div>
        ))}
        <datalist id="need-manufacturers">
          {manufacturers.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setItems([...(items ?? []), emptyNeed()])}>
            Add a line
          </button>
          <MatchButton />
        </div>
        {matched.error ? <p className="text-sm text-danger">{matched.error}</p> : null}
      </form>
    </div>
  );
}

function ExtractButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-copper" disabled={pending}>
      {pending ? "Reading…" : "Read equipment"}
    </button>
  );
}

function MatchButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" disabled={pending}>
      {pending ? "Matching…" : "Match inventory"}
    </button>
  );
}
