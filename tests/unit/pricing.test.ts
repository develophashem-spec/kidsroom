import { describe, expect, it } from "vitest";
import { shippingConfig } from "@/config/site";
import { amountToFreeShipping, calculateTotals } from "@/lib/pricing";

describe("calculateTotals", () => {
  it("adds flat-rate shipping below the free-shipping threshold", () => {
    const totals = calculateTotals(shippingConfig.freeThreshold - 1);
    expect(totals.shipping).toBe(shippingConfig.flatRate);
    expect(totals.total).toBe(totals.subtotal + shippingConfig.flatRate);
  });

  it("ships free at and above the threshold", () => {
    expect(calculateTotals(shippingConfig.freeThreshold)).toEqual({
      subtotal: shippingConfig.freeThreshold,
      shipping: 0,
      total: shippingConfig.freeThreshold,
    });
    expect(calculateTotals(shippingConfig.freeThreshold + 500).shipping).toBe(0);
  });

  it("charges nothing for an empty basket", () => {
    expect(calculateTotals(0)).toEqual({ subtotal: 0, shipping: 0, total: 0 });
  });
});

describe("amountToFreeShipping", () => {
  it("reports how much more to spend", () => {
    expect(amountToFreeShipping(shippingConfig.freeThreshold - 2500)).toBe(2500);
    expect(amountToFreeShipping(shippingConfig.freeThreshold)).toBe(0);
    expect(amountToFreeShipping(shippingConfig.freeThreshold * 2)).toBe(0);
    expect(amountToFreeShipping(0)).toBe(shippingConfig.freeThreshold);
  });
});
