/**
 * Inventory sources. Names here are dealers, not equipment makers.
 * `hidePhotosPublic` keeps watermarked photos off buyer pages.
 */
export type InventorySource = {
  id: string;
  label: string;
  platforms: string[];
  names: string[];
  hidePhotosPublic?: boolean;
};

export const sourceCatalog: InventorySource[] = [
  { id: "arcbarn", label: "Arcbarn", platforms: ["arcbarn.com"], names: ["Arcbarn"] },
  {
    id: "cigroup",
    label: "CI Group",
    platforms: ["cigroup-us.com"],
    names: ["CI Group", "Critical Infrastructure Group"],
    hidePhotosPublic: true,
  },
  {
    id: "midwest",
    label: "Midwest Engines & Generators",
    platforms: ["midwest-generators.com"],
    names: ["Midwest Engines & Generators", "Midwest Engines"],
  },
  {
    id: "gruber",
    label: "Gruber Power Services",
    platforms: ["gruberpower.com"],
    names: ["Gruber Power Services", "Gruber Power"],
  },
  { id: "apasof", label: "APASOF", platforms: ["apasof.com"], names: ["APASOF"] },
  {
    id: "usadecom",
    label: "USA Decom",
    platforms: ["usadecommissioning.com"],
    names: ["USA Decom", "USA Decommissioning"],
  },
  { id: "atlas", label: "Atlas Electric", platforms: ["atlaselectricinc.com"], names: ["Atlas Electric"] },
  {
    id: "pnw",
    label: "Pacific Northwest Power",
    platforms: ["pnwpower.com"],
    names: ["Pacific Northwest Power"],
  },
  { id: "farbazaar", label: "The FAR Bazaar", platforms: ["thefarbazaar.com"], names: ["The FAR Bazaar", "FAR Bazaar"] },
  { id: "proven", label: "Proven Performer", platforms: ["provenperformer.com"], names: ["Proven Performer"] },
  {
    id: "dces",
    label: "DCES",
    platforms: ["dces.com"],
    names: ["DCES", "Data Center Equipment Sales"],
  },
  { id: "gentel", label: "Gentel Power", platforms: ["gentelpower.com"], names: ["Gentel Power"] },
  {
    id: "turnkey",
    label: "Turnkey Industries",
    platforms: ["turnkey-industries.com"],
    names: ["Turnkey Industries"],
  },
  {
    id: "wpp",
    label: "Worldwide Power Products",
    platforms: ["wpowerproducts.com"],
    names: ["Worldwide Power Products"],
  },
  {
    id: "instock",
    label: "In Stock Equipment",
    platforms: ["instockequipment.com"],
    names: ["In Stock Equipment"],
  },
  { id: "machinio", label: "Machinio", platforms: ["machinio.com"], names: ["Machinio"] },
  {
    id: "transformer-network",
    label: "Transformer Network",
    platforms: [],
    names: ["Transformer Network"],
  },
];

export function sourceById(id: string) {
  const source = sourceCatalog.find((item) => item.id === id);
  if (!source) throw new Error(`Unknown inventory source ${id}`);
  return source;
}

export function sourceDealerNames() {
  const names = new Set<string>();
  for (const source of sourceCatalog) {
    names.add(source.label);
    for (const name of source.names) names.add(name);
  }
  return [...names];
}

function hostKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
}

/** True when this listing's source marks its photos as not for public pages. */
export function hidesPublicPhotos(source: { sourcePlatform?: string | null; sourceUrl?: string | null } | string | null | undefined) {
  const values = typeof source === "string" || source == null ? [source] : [source.sourcePlatform, source.sourceUrl];
  const keys = values.filter((value): value is string => Boolean(value)).map(hostKey);
  return sourceCatalog.some((item) => {
    if (!item.hidePhotosPublic) return false;
    const ids = [item.id, item.label.toLowerCase(), ...item.platforms.map(hostKey)];
    return keys.some((key) => ids.includes(key));
  });
}
