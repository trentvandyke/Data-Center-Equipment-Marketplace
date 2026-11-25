import { dealerDomains, dealerNames } from "@/lib/dealer-identities";

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

/** Remove dealer identity, contacts, and dealer stock numbers from buyer-facing text. */
export function sanitizePublicText(input: string | null | undefined, extraNames: string[] = []) {
  if (!input) return "";
  let text = input;
  text = text.replace(/(?:https?:\/\/|\/\/)\S+/gi, " ");
  text = text.replace(/\bwww\.[^\s]+/gi, " ");
  text = text.replace(/\b(?:mailto|tel):[^\s]+/gi, " ");
  text = text.replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, " ");
  for (const domain of dealerDomains) {
    text = text.replace(new RegExp(escapeRegExp(domain), "ig"), " ");
  }
  const names = [...dealerNames, ...extraNames].filter((name) => name.length > 3).sort((a, b) => b.length - a.length);
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

export function formatPublicCode(sequence: number) {
  return `RB-${String(sequence).padStart(6, "0")}`;
}

export function buyerPhotoSrc(photoId: string) {
  return `/api/img/${encodeURIComponent(photoId)}`;
}

export function isHostedFile(url: string) {
  return url.startsWith("/uploads/") || url.includes(".blob.vercel-storage.com");
}

/** Fields stored for buyers. Raw title, description, seller, and source URL stay on the listing. */
export function publicCopy(listing: Pick<PublicListingSource, "title" | "description" | "location" | "externalSeller">) {
  const aliases = sellerAliases(listing.externalSeller);
  const location = sanitizePublicText(listing.location, aliases);
  return {
    publicTitle: sanitizePublicText(listing.title, aliases).slice(0, 240),
    publicDescription: sanitizePublicText(listing.description, aliases).slice(0, 8000),
    publicLocation: (location || "Location on request").slice(0, 160),
  };
}

export type PublicListingSource = {
  publicCode?: string | null;
  publicTitle?: string | null;
  publicDescription?: string | null;
  publicLocation?: string | null;
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
  const manufacturer = sanitizePublicText(listing.manufacturer, aliases);
  const manufacturerHidden = dealerNames.some((name) => name.toLowerCase() === listing.manufacturer.trim().toLowerCase());
  return {
    code: listing.publicCode ?? "",
    title,
    description: sanitizePublicText(listing.publicDescription || listing.description, aliases),
    location: sanitizePublicText(listing.publicLocation || listing.location, aliases),
    manufacturer: manufacturerHidden ? "" : manufacturer,
    model: sanitizePublicText(listing.model, aliases),
    typeLabel: sanitizePublicText(listing.sourceCategory, aliases),
    priceText: sanitizePublicText(listing.priceText, aliases),
    ratingText: sanitizePublicText(listing.ratingText, aliases),
    voltageText: sanitizePublicText(listing.voltageText, aliases),
  };
}
