import { conditions, labelOf, listingStatuses } from "@/lib/catalog";

export function ConditionBadge({ condition }: { condition: string }) {
  const tone =
    condition === "NEW_SURPLUS"
      ? "bg-pine text-white"
      : condition === "USED_TESTED"
        ? "bg-ink text-paper"
        : condition === "USED" || condition === "FOR_PARTS"
          ? "bg-ink-soft text-paper"
          : condition === "REFURBISHED"
            ? "bg-pine text-white"
            : condition === "NOT_STATED"
              ? "bg-white/90 text-ink"
              : "bg-copper text-white";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>
      {labelOf(conditions, condition)}
    </span>
  );
}

export function SampleBadge() {
  return (
    <span className="rounded-full border border-copper bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-copper">
      Sample
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "ACTIVE"
      ? "bg-pine/10 text-pine"
      : status === "SOLD"
        ? "bg-ink/10 text-ink"
        : status === "HIDDEN"
          ? "bg-copper/10 text-copper-dark"
          : "bg-danger/10 text-danger";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>
      {labelOf(listingStatuses, status)}
    </span>
  );
}
