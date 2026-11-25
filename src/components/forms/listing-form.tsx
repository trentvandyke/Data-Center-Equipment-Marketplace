"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { saveListing } from "@/actions/listings";
import { ListingImage } from "@/components/listing-image";
import {
  categories,
  conditions,
  documentKinds,
  frequencies,
  leadTimes,
  manufacturers,
  phases,
  ratingUnits,
  voltageClasses,
} from "@/lib/catalog";
import { fieldError, type ActionState } from "@/lib/types";

export type ListingFormValues = {
  id: string;
  title: string;
  category: string;
  manufacturer: string;
  condition: string;
  priceCents: number | null;
  quantity: number;
  location: string;
  voltageClass: string;
  ratingValue: number | null;
  ratingUnit: string | null;
  phase: string | null;
  frequencyHz: number | null;
  year: number | null;
  model: string | null;
  serialNumber: string | null;
  leadTime: string;
  description: string;
  status: string;
  photos: { id: string; url: string; alt: string }[];
  documents: { id: string; filename: string; kind: string }[];
};

export function ListingForm({ listing }: { listing?: ListingFormValues }) {
  const [state, action] = useActionState(saveListing.bind(null, listing?.id ?? ""), {} as ActionState);
  const [quote, setQuote] = useState(listing ? listing.priceCents == null : false);
  const [previews, setPreviews] = useState<string[]>([]);
  const price =
    listing?.priceCents != null ? (listing.priceCents / 100).toFixed(listing.priceCents % 100 === 0 ? 0 : 2) : "";

  return (
    <form action={action} className="grid gap-6">
      {state.error ? <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p> : null}

      <section className="panel grid gap-4 p-5">
        <h2 className="font-serif text-2xl">Equipment</h2>
        <Field label="Title" error={fieldError(state, "title")}>
          <input name="title" required minLength={8} maxLength={140} defaultValue={listing?.title} className="field" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" error={fieldError(state, "category")}>
            <select name="category" required defaultValue={listing?.category ?? ""} className="field">
              <option value="">Select</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Manufacturer" error={fieldError(state, "manufacturer")}>
            <input
              name="manufacturer"
              required
              list="manufacturer-list"
              defaultValue={listing?.manufacturer}
              className="field"
              placeholder="Eaton, Vertiv, Caterpillar…"
            />
            <datalist id="manufacturer-list">
              {manufacturers.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>
          <Field label="Condition" error={fieldError(state, "condition")}>
            <select name="condition" required defaultValue={listing?.condition ?? ""} className="field">
              <option value="">Select</option>
              {conditions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Model">
            <input name="model" defaultValue={listing?.model ?? ""} maxLength={80} className="field" />
          </Field>
        </div>
      </section>

      <section className="panel grid gap-4 p-5">
        <h2 className="font-serif text-2xl">Commercial</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="requestQuote"
            checked={quote}
            onChange={(event) => setQuote(event.target.checked)}
          />
          Request quote instead of listing a price
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price (USD)" error={fieldError(state, "price")}>
            <input
              name="price"
              inputMode="decimal"
              defaultValue={price}
              disabled={quote}
              className="field"
              placeholder="18500"
            />
          </Field>
          <Field label="Quantity" error={fieldError(state, "quantity")}>
            <input
              name="quantity"
              type="number"
              min={1}
              max={999}
              required
              defaultValue={listing?.quantity ?? 1}
              className="field"
            />
          </Field>
          <Field label="Location" error={fieldError(state, "location")}>
            <input
              name="location"
              required
              defaultValue={listing?.location}
              placeholder="Dallas, TX"
              className="field"
            />
          </Field>
          <Field label="Lead time" error={fieldError(state, "leadTime")}>
            <select name="leadTime" required defaultValue={listing?.leadTime ?? "IN_STOCK"} className="field">
              {leadTimes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          {listing && (listing.status === "ACTIVE" || listing.status === "SOLD") ? (
            <Field label="Listing status" error={fieldError(state, "status")}>
              <select name="status" defaultValue={listing.status} className="field">
                <option value="ACTIVE">Active</option>
                <option value="SOLD">Sold</option>
              </select>
            </Field>
          ) : null}
        </div>
      </section>

      <section className="panel grid gap-4 p-5">
        <h2 className="font-serif text-2xl">Electrical specs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Voltage class" error={fieldError(state, "voltageClass")}>
            <select name="voltageClass" required defaultValue={listing?.voltageClass ?? ""} className="field">
              <option value="">Select</option>
              {voltageClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rating" error={fieldError(state, "ratingValue")}>
            <input
              name="ratingValue"
              inputMode="decimal"
              required
              defaultValue={listing?.ratingValue ?? ""}
              className="field"
            />
          </Field>
          <Field label="Rating unit" error={fieldError(state, "ratingUnit")}>
            <select name="ratingUnit" required defaultValue={listing?.ratingUnit ?? ""} className="field">
              <option value="">Select</option>
              {ratingUnits.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Phase" error={fieldError(state, "phase")}>
            <select name="phase" defaultValue={listing?.phase ?? "3"} className="field">
              {phases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Frequency" error={fieldError(state, "frequencyHz")}>
            <select name="frequencyHz" defaultValue={String(listing?.frequencyHz ?? 60)} className="field">
              {frequencies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year" error={fieldError(state, "year")}>
            <input name="year" inputMode="numeric" defaultValue={listing?.year ?? ""} className="field" placeholder="2018" />
          </Field>
          <Field label="Serial number" error={fieldError(state, "serialNumber")}>
            <input name="serialNumber" defaultValue={listing?.serialNumber ?? ""} maxLength={80} className="field" />
          </Field>
        </div>
      </section>

      <section className="panel grid gap-4 p-5">
        <h2 className="font-serif text-2xl">Photos and documents</h2>
        {listing && listing.photos.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {listing.photos.map((photo) => (
              <li key={photo.id} className="overflow-hidden rounded-lg border border-line">
                <ListingImage src={`/api/img/${photo.id}`} alt="" category={listing.category} className="aspect-[4/3] w-full object-cover" />
                <label className="flex items-center gap-2 px-2 py-2 text-xs">
                  <input type="checkbox" name="removePhoto" value={photo.id} />
                  Remove
                </label>
              </li>
            ))}
          </ul>
        ) : null}
        <Field label={listing ? "Add photos" : "Photos"} error={fieldError(state, "photos")}>
          <input
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="block w-full text-sm"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              setPreviews(files.map((file) => URL.createObjectURL(file)));
            }}
          />
          <span className="mt-1 block text-xs text-muted">JPG, PNG, or WebP. Up to 8 photos, 4 MB each.</span>
        </Field>
        {previews.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto">
            {previews.map((src) => (
              <span key={src} className="block h-20 w-28 overflow-hidden rounded-md">
                <ListingImage src={src} alt="" category={listing?.category ?? "related"} />
              </span>
            ))}
          </div>
        ) : null}
        {listing && listing.documents.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {listing.documents.map((doc) => (
              <li key={doc.id}>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="removeDocument" value={doc.id} />
                  Remove {doc.filename}
                </label>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="PDF attachments" error={fieldError(state, "documents")}>
            <input name="documents" type="file" accept="application/pdf" multiple className="block w-full text-sm" />
            <span className="mt-1 block text-xs text-muted">Test reports, spec sheets, or drawings. Up to 4 files, 8 MB each.</span>
          </Field>
          <Field label="Document type" error={fieldError(state, "documentKind")}>
            <select name="documentKind" defaultValue="TEST_REPORT" className="field">
              {documentKinds.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="panel grid gap-4 p-5">
        <h2 className="font-serif text-2xl">Description</h2>
        <Field label="What a buyer should know" error={fieldError(state, "description")}>
          <textarea
            name="description"
            required
            minLength={30}
            defaultValue={listing?.description}
            className="field"
            placeholder="Configuration, hours, what is included, what was tested, and how it is stored."
          />
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <SubmitButton label={listing ? "Save listing" : "Publish listing"} />
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-danger">{error}</span> : null}
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}
