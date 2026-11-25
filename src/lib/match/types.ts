export type EquipmentNeed = {
  label: string;
  category: string;
  voltage: string;
  kw: number | null;
  kva: number | null;
  amps: number | null;
  phase: string | null;
  quantity: number | null;
  manufacturer: string | null;
  configuration: string | null;
  notes: string;
};

export type MatchCandidate = {
  id: string;
  slug: string;
  title: string;
  category: string;
  sourceCategory: string | null;
  manufacturer: string;
  voltageClass: string;
  voltageText: string | null;
  ratingText: string | null;
  kw: number | null;
  kva: number | null;
  amps: number | null;
  ratingValue: number | null;
  ratingUnit: string | null;
  quantity: number;
  condition: string;
  priceCents: number | null;
  priceText: string | null;
  location: string;
  seller: string;
  code?: string;
  phase: string | null;
};

export type MatchHit = {
  candidate: MatchCandidate;
  score: number;
  reasons: string[];
};
