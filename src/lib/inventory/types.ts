/** One row from a dealer snapshot or a live crawl, before it is stored. */
export type InventoryRecord = {
  category: string;
  manufacturer: string;
  model: string;
  title: string;
  rating: string;
  kw: number | null;
  kva: number | null;
  amps: number | null;
  voltage: string;
  condition: string;
  conditionRaw: string;
  year: string;
  hours: string;
  quantity: string;
  qty: number | null;
  priceUsd: number | null;
  priceText: string;
  location: string;
  seller: string;
  sellerType: string;
  platform: string;
  url: string;
  dateChecked: string;
  notes: string;
  imageUrl?: string;
  imageUrls?: string[];
};

export type ImportReport = {
  received: number;
  unique: number;
  created: number;
  updated: number;
  unchanged: number;
  reactivated: number;
  markedStale: number;
  skipped: number;
  platforms: string[];
  staleSkippedReason?: string;
};
