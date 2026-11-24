export function SpecPlate({
  category,
  rating,
  voltage,
}: {
  category: string;
  rating: string;
  voltage: string;
}) {
  return (
    <div className="flex h-full flex-col justify-between bg-ink p-4 text-paper">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-copper">{category}</p>
      <p className="font-serif text-2xl leading-tight">{rating}</p>
      <p className="text-sm text-paper/70">{voltage || "Voltage not stated"}</p>
    </div>
  );
}
