import { dealerDomains, dealerNames, shortDealerTokens } from "@/lib/dealer-identities";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sellerAliases(seller: string | null | undefined) {
  if (!seller) return [];
  return seller
    .split(/\bvia\b|\(|\)/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 3);
}

/** Drop "Original listing on <market> by <seller>; read by <date>" and any leftover fragment. */
export function stripProvenance(input: string) {
  return input
    .replace(/Original listing on\b.+?\bread by\b.+?\d{4}/gi, " ")
    .replace(/\bOriginal listing on\b[^.]*/gi, " ");
}

function isNonOem(value: string) {
  const core = value.trim().toLowerCase();
  if (!core) return true;
  return [...dealerNames, ...shortDealerTokens].some((name) => {
    const token = name.toLowerCase();
    return core === token || core.startsWith(`${token} `) || core.startsWith(`${token},`) || core.startsWith(`${token}(`);
  });
}

function stripStockSuffix(value: string) {
  return value.replace(/,\s*\S*\d\S*$/g, "").trim();
}

/** Buyer-facing manufacturer. Dealer and rebuilder names become Unbranded/Other. */
export function publicManufacturerName(raw: string | null | undefined) {
  let text = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!text || /^unspecified$/i.test(text) || /^maker not stated\b/i.test(text)) return "Unbranded/Other";
  if (/^unbranded\/other$/i.test(text)) return "Unbranded/Other";
  const rebuilt = text.match(/^(.*?)\s*\((?:rebuilt|reconditioned|refurbished)\s+by\s+[^)]+\)\s*(?:,.*)?$/i);
  if (rebuilt) {
    const oem = stripStockSuffix(rebuilt[1].trim());
    if (!oem || isNonOem(oem)) return "Unbranded/Other";
    return `${oem} (remanufactured)`;
  }
  text = stripStockSuffix(text);
  if (/^various:/i.test(text)) {
    const parts = text
      .replace(/^various:\s*/i, "")
      .split(/,|\band\b|\//i)
      .map((part) => part.replace(/\band others\b/i, "").trim())
      .filter((part) => part && !/^others?$/i.test(part) && !isNonOem(part));
    return parts.length ? parts.join(", ") : "Unbranded/Other";
  }
  const core = text.split("(")[0].trim();
  if (isNonOem(core) || isNonOem(text)) return "Unbranded/Other";
  return text;
}

/** Remove dealer identity, contacts, and dealer stock numbers from buyer-facing text. */
export function sanitizePublicText(input: string | null | undefined, extraNames: string[] = []) {
  if (!input) return "";
  let text = stripProvenance(input);
  text = text.replace(/\bWPP(?=\d)/gi, " ");
  text = text.replace(/(?:https?:\/\/|\/\/)\S+/gi, " ");
  text = text.replace(/\bwww\.[^\s]+/gi, " ");
  text = text.replace(/\b(?:mailto|tel):[^\s]+/gi, " ");
  text = text.replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, " ");
  for (const domain of dealerDomains) {
    text = text.replace(new RegExp(escapeRegExp(domain), "ig"), " ");
  }
  const names = [...dealerNames, ...shortDealerTokens, ...extraNames]
    .filter((name) => name.length >= 3)
    .sort((a, b) => b.length - a.length);
  for (const name of names) {
    text = text.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, "ig"), " ");
  }
  text = text.replace(/(?:\+?1[-.\s]*)?(?:\(?\d{3}\)?[-.\s]*)\d{3}[-.\s]*\d{4}/g, " ");
  text = text.replace(/\b(?:stock|sku|item|ref|reference)\s*(?:no\.?|number|#)?\s*[:#-]?\s*[A-Z0-9-]{2,}\b/gi, " ");
  text = text.replace(/\bMEG\d+\b/gi, " ");
  text = text.replace(/\bp-\d{3,}\b/gi, " ");
  text = text.replace(/\(\s*seller[^)]*\)/gi, " ");
  text = text.replace(/\b(?:dealer|seller|sourced from)\b/gi, " ");
  text = text.replace(/Availability and price were copied from a public listing\.?/gi, " ");
  text = text.replace(/Confirm both on the original page before you buy\.?/gi, " ");
  text = text.replace(/\bvia\b/gi, " ");
  text = text.replace(/\(\s*\)/g, " ");
  text = text.replace(/\s{2,}/g, " ");
  text = text.replace(/\s+([,.;])/g, "$1");
  text = text.replace(/^[,.\s-]+|[,.\s-]+$/g, "");
  return text.trim();
}

const publicCodePattern = /^(?:GAX|RB)-(\d+)$/;

export function formatPublicCode(sequence: number) {
  return `GAX-${String(sequence).padStart(6, "0")}`;
}

/** Numeric part of a GAX- or legacy RB- code. The number stays put when the prefix changes. */
export function publicCodeSequence(code: string | null | undefined) {
  const match = code?.match(publicCodePattern);
  if (!match) return null;
  const sequence = Number(match[1]);
  return Number.isFinite(sequence) ? sequence : null;
}

export function canonicalPublicCode(code: string | null | undefined) {
  const sequence = publicCodeSequence(code);
  return sequence == null ? null : formatPublicCode(sequence);
}

export function buyerPhotoSrc(photoId: string) {
  return `/api/img/${encodeURIComponent(photoId)}`;
}

export function isHostedFile(url: string) {
  return url.startsWith("/uploads/") || url.includes(".blob.vercel-storage.com");
}

/** Fields stored for buyers. Raw title, description, seller, and source URL stay on the listing. */
export function publicCopy(
  listing: Pick<PublicListingSource, "title" | "description" | "location" | "externalSeller" | "manufacturer">,
) {
  const aliases = sellerAliases(listing.externalSeller);
  const location = sanitizePublicText(listing.location, aliases);
  return {
    publicTitle: sanitizePublicText(listing.title, aliases).slice(0, 240),
    publicDescription: sanitizePublicText(listing.description, aliases).slice(0, 8000),
    publicLocation: (location || "Location on request").slice(0, 160),
    publicManufacturer: publicManufacturerName(listing.manufacturer).slice(0, 160),
  };
}

export type PublicListingSource = {
  publicCode?: string | null;
  publicTitle?: string | null;
  publicDescription?: string | null;
  publicLocation?: string | null;
  publicManufacturer?: string | null;
  title: string;
  description: string;
  location: string;
  manufacturer: string;
  model?: string | null;
  sourceCategory?: string | null;
  serialNumber?: string | null;
  priceText?: string | null;
  ratingText?: string | null;
  voltageText?: string | null;
  externalSeller?: string | null;
  notes?: string | null;
};

export function toPublicListing(listing: PublicListingSource) {
  const aliases = sellerAliases(listing.externalSeller);
  const title = sanitizePublicText(listing.publicTitle || listing.title, aliases);
  const manufacturer = publicManufacturerName(listing.publicManufacturer || listing.manufacturer);
  return {
    code: listing.publicCode ?? "",
    title,
    description: sanitizePublicText(listing.publicDescription || listing.description, aliases),
    location: sanitizePublicText(listing.publicLocation || listing.location, aliases),
    manufacturer: manufacturer === "Unbranded/Other" ? "" : manufacturer,
    model: sanitizePublicText(listing.model, aliases),
    typeLabel: sanitizePublicText(listing.sourceCategory, aliases),
    priceText: sanitizePublicText(listing.priceText, aliases),
    ratingText: sanitizePublicText(listing.ratingText, aliases),
    voltageText: sanitizePublicText(listing.voltageText, aliases),
  };
}
