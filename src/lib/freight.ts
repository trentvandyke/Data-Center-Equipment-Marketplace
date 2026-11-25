/**
 * Freight seam. Rigging and trucking stay off platform for now.
 * A later provider should implement FreightProvider (rate request,
 * BOL handoff) and replace `freight`.
 */
export type FreightQuoteInput = {
  listingId: string;
  origin: string;
  destination: string;
  weightLb?: number;
};

export type FreightProvider = {
  id: string;
  enabled: boolean;
  buyerMessage: string;
  quoteShipment(input: FreightQuoteInput): Promise<{ quoteId: string; summary: string }>;
};

export const freight: FreightProvider = {
  id: "off_platform",
  enabled: false,
  buyerMessage: "",
  async quoteShipment() {
    throw new Error("Freight quoting is not enabled.");
  },
};
