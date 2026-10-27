import { shippingConfig } from "@/config/site";

export type Totals = {
  subtotal: number;
  shipping: number;
  total: number;
};

/**
 * Shipping is a flat rate that is waived once the basket reaches the free-shipping
 * threshold. Prices are tax-inclusive. All values are integer cents.
 */
export function calculateTotals(subtotal: number): Totals {
  const shipping =
    subtotal <= 0 || subtotal >= shippingConfig.freeThreshold ? 0 : shippingConfig.flatRate;
  return { subtotal, shipping, total: subtotal + shipping };
}

/** How much more the customer must spend to unlock free shipping (0 when already free). */
export function amountToFreeShipping(subtotal: number): number {
  if (subtotal <= 0) return shippingConfig.freeThreshold;
  return Math.max(0, shippingConfig.freeThreshold - subtotal);
}
