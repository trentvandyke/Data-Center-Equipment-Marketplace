import { site } from "@/lib/config";

/**
 * Payment seam. Checkout is intentionally off in this version.
 * A later provider (for example Stripe Checkout) should implement
 * PaymentProvider and replace `payments` without changing listing pages
 * beyond the `enabled` branch.
 */
export type CheckoutInput = {
  listingId: string;
  buyerId: string;
  quantity: number;
  amountCents: number;
  successPath: string;
  cancelPath: string;
};

export type PaymentProvider = {
  id: string;
  enabled: boolean;
  buyerMessage: string;
  createCheckout(input: CheckoutInput): Promise<{ url: string }>;
};

export const payments: PaymentProvider = {
  id: "off_platform",
  enabled: false,
  buyerMessage: `Quotes, payment, and logistics are handled by ${site.name}.`,
  async createCheckout() {
    throw new Error("Online payment is not enabled.");
  },
};
