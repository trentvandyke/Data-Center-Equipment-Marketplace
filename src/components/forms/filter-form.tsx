"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { categories, conditions, leadTimes, ratingUnits, voltageClasses } from "@/lib/catalog";

export type FilterValues = {
  q: string;
  category: string;
  manufacturer: string;
  condition: string;
  voltage: string;
  lead: string;
  location: string;
  priceMin: string;
  priceMax: string;
  ratingMin: string;
  ratingMax: string;
  ratingUnit: string;
  sort: string;
  fresh: string;
};

export function FilterForm({ values, manufacturers }: { values: FilterValues; manufacturers: string[] }) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    }
    const qs = params.toString();
    router.push(qs ? `/listings?${qs}` : "/listings");
  }

  return (
    <form action="/listings" method="get" onSubmit={onSubmit} className="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="sm:col-span-2">
        <span className="label">Keyword</span>
        <input name="q" defaultValue={values.q} placeholder="Model, city, manufacturer…" className="field" />
      </label>
      <Select label="Category" name="category" value={values.category} options={categories} />
      <Select
        label="Manufacturer"
        name="manufacturer"
        value={values.manufacturer}
        options={manufacturers.map((name) => ({ id: name, label: name }))}
      />
      <Select label="Condition" name="condition" value={values.condition} options={conditions} />
      <Select label="Voltage class" name="voltage" value={values.voltage} options={voltageClasses} />
      <Select label="Lead time" name="lead" value={values.lead} options={leadTimes} />
      <label>
        <span className="label">Location</span>
        <input name="location" defaultValue={values.location} placeholder="Ashburn, Dallas…" className="field" />
      </label>
      <label>
        <span className="label">Min price (USD)</span>
        <input name="priceMin" inputMode="decimal" defaultValue={values.priceMin} className="field" />
      </label>
      <label>
        <span className="label">Max price (USD)</span>
        <input name="priceMax" inputMode="decimal" defaultValue={values.priceMax} className="field" />
      </label>
      <label>
        <span className="label">Min rating</span>
        <input name="ratingMin" inputMode="decimal" defaultValue={values.ratingMin} className="field" />
      </label>
      <label>
        <span className="label">Max rating</span>
        <input name="ratingMax" inputMode="decimal" defaultValue={values.ratingMax} className="field" />
      </label>
      <Select label="Rating unit" name="ratingUnit" value={values.ratingUnit} options={ratingUnits} />
      <label>
        <span className="label">Sort</span>
        <select name="sort" defaultValue={values.sort} className="field">
          <option value="newest">Newest</option>
          <option value="price_asc">Price, low to high</option>
          <option value="price_desc">Price, high to low</option>
        </select>
      </label>
      <label className="flex items-center gap-2 self-end text-sm">
        <input type="checkbox" name="fresh" value="week" defaultChecked={values.fresh === "week"} />
        New this week
      </label>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <button className="btn btn-primary" type="submit">
          Apply filters
        </button>
        <Link href="/listings" className="btn btn-ghost">
          Clear
        </Link>
        <p className="text-xs text-muted">A price range hides request-quote listings.</p>
      </div>
    </form>
  );
}

function Select({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: readonly { id: string; label: string }[];
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <select name={name} defaultValue={value} className="field">
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
