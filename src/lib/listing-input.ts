import {
  categories,
  conditions,
  documentKinds,
  frequencies,
  hasId,
  leadTimes,
  phases,
  ratingUnits,
  voltageClasses,
} from "@/lib/catalog";
import { parseDollarsToCents } from "@/lib/format";

export type ListingInput = {
  title: string;
  category: string;
  manufacturer: string;
  condition: string;
  requestQuote: boolean;
  priceCents: number | null;
  quantity: number;
  location: string;
  voltageClass: string;
  ratingValue: number;
  ratingUnit: string;
  phase: string;
  frequencyHz: number;
  year: number | null;
  model: string | null;
  serialNumber: string | null;
  leadTime: string;
  description: string;
  documentKind: string;
  status: "ACTIVE" | "SOLD" | null;
};

export type ListingParse = {
  data?: ListingInput;
  fieldErrors: Record<string, string[]>;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: string) {
  return value ? value : null;
}

export function parseListingInput(formData: FormData, opts: { allowStatus: boolean }): ListingParse {
  const fieldErrors: Record<string, string[]> = {};
  const fail = (key: string, message: string) => {
    fieldErrors[key] = [...(fieldErrors[key] ?? []), message];
  };

  const title = text(formData, "title");
  const category = text(formData, "category");
  const manufacturer = text(formData, "manufacturer").replace(/\s+/g, " ");
  const condition = text(formData, "condition");
  const requestQuote = formData.get("requestQuote") === "on";
  const priceRaw = text(formData, "price");
  const quantityRaw = text(formData, "quantity") || "1";
  const location = text(formData, "location");
  const voltageClass = text(formData, "voltageClass");
  const ratingRaw = text(formData, "ratingValue");
  const ratingUnit = text(formData, "ratingUnit");
  const phase = text(formData, "phase") || "3";
  const frequencyRaw = text(formData, "frequencyHz") || "60";
  const yearRaw = text(formData, "year");
  const model = optional(text(formData, "model"));
  const serialNumber = optional(text(formData, "serialNumber"));
  const leadTime = text(formData, "leadTime");
  const description = text(formData, "description");
  const documentKind = text(formData, "documentKind") || "TEST_REPORT";
  const statusRaw = text(formData, "status");

  if (title.length < 8) fail("title", "Use a title of at least 8 characters.");
  if (title.length > 140) fail("title", "Keep the title under 140 characters.");
  if (!hasId(categories, category)) fail("category", "Choose a category.");
  if (manufacturer.length < 2 || manufacturer.length > 80) {
    fail("manufacturer", "Enter the manufacturer.");
  }
  if (!hasId(conditions, condition)) fail("condition", "Choose a condition.");
  if (location.length < 2 || location.length > 80) fail("location", "Enter the equipment location.");
  if (!hasId(voltageClasses, voltageClass)) fail("voltageClass", "Choose a voltage class.");
  if (!hasId(ratingUnits, ratingUnit)) fail("ratingUnit", "Choose kVA, kW, or amps.");
  if (!hasId(leadTimes, leadTime)) fail("leadTime", "Choose availability.");
  if (!hasId(phases, phase)) fail("phase", "Choose a phase.");
  if (!hasId(documentKinds, documentKind)) fail("documentKind", "Choose a document type.");
  if (description.length < 30) fail("description", "Describe the gear in at least a sentence or two.");
  if (description.length > 8000) fail("description", "Description is too long.");

  const ratingValue = Number(ratingRaw);
  if (!ratingRaw || !Number.isFinite(ratingValue) || ratingValue <= 0 || ratingValue > 20000) {
    fail("ratingValue", "Enter a rating greater than 0.");
  }

  const quantity = Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    fail("quantity", "Quantity must be a whole number from 1 to 999.");
  }

  const frequencyHz = Number(frequencyRaw);
  if (!hasId(frequencies, frequencyRaw) || !Number.isInteger(frequencyHz)) {
    fail("frequencyHz", "Choose 50 or 60 Hz.");
  }

  let year: number | null = null;
  if (yearRaw) {
    year = Number(yearRaw);
    const maxYear = new Date().getUTCFullYear() + 1;
    if (!Number.isInteger(year) || year < 1960 || year > maxYear) {
      fail("year", `Year must be between 1960 and ${maxYear}.`);
    }
  }

  let priceCents: number | null = null;
  if (!requestQuote) {
    priceCents = parseDollarsToCents(priceRaw);
    if (priceCents == null || priceCents <= 0 || priceCents > 50_000_000_00) {
      fail("price", "Enter a price, or choose request quote.");
    }
  }

  if (model && model.length > 80) fail("model", "Model is too long.");
  if (serialNumber && serialNumber.length > 80) fail("serialNumber", "Serial number is too long.");

  let status: "ACTIVE" | "SOLD" | null = null;
  if (opts.allowStatus && statusRaw) {
    if (statusRaw !== "ACTIVE" && statusRaw !== "SOLD") fail("status", "Choose active or sold.");
    else status = statusRaw;
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  return {
    fieldErrors,
    data: {
      title,
      category,
      manufacturer,
      condition,
      requestQuote,
      priceCents,
      quantity,
      location,
      voltageClass,
      ratingValue,
      ratingUnit,
      phase,
      frequencyHz,
      year,
      model,
      serialNumber,
      leadTime,
      description,
      documentKind,
      status,
    },
  };
}
