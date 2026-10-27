import { describe, expect, it } from "vitest";
import {
  MAX_PRICE_CENTS,
  centsToInputValue,
  discountPercent,
  formatMoney,
  parseMoneyToCents,
} from "@/lib/money";

describe("formatMoney", () => {
  it("formats integer cents as currency", () => {
    expect(formatMoney(4990, { currency: "USD", locale: "en-US" })).toBe("$49.90");
    expect(formatMoney(0, { currency: "USD", locale: "en-US" })).toBe("$0.00");
    expect(formatMoney(123456, { currency: "USD", locale: "en-US" })).toBe("$1,234.56");
  });

  it("falls back to a plain string for an invalid currency code", () => {
    expect(formatMoney(1000, { currency: "not-a-currency" })).toBe("not-a-currency 10.00");
  });
});

describe("parseMoneyToCents", () => {
  it.each([
    ["49.90", 4990],
    ["49.9", 4990],
    ["49", 4900],
    ["0", 0],
    ["0.05", 5],
    [" 12.50 ", 1250],
    [19.99, 1999],
    [0.1 + 0.2, 30],
    [10, 1000],
  ])("parses %j as %i cents", (input, expected) => {
    expect(parseMoneyToCents(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "1.234", "1,000", "1e3", ".5", "5.", "99999999", Number.NaN, -1, 1.005, Infinity])(
    "rejects %j",
    (input) => {
      expect(parseMoneyToCents(input)).toBeNull();
    },
  );

  it("accepts the maximum price but nothing above it", () => {
    expect(parseMoneyToCents(String(MAX_PRICE_CENTS / 100))).toBe(MAX_PRICE_CENTS);
    expect(parseMoneyToCents(String(MAX_PRICE_CENTS / 100 + 0.01))).toBeNull();
  });
});

describe("centsToInputValue", () => {
  it("renders two decimals", () => {
    expect(centsToInputValue(4990)).toBe("49.90");
    expect(centsToInputValue(5)).toBe("0.05");
  });
});

describe("discountPercent", () => {
  it("computes the saving against the compare-at price", () => {
    expect(discountPercent(7500, 10000)).toBe(25);
    expect(discountPercent(3333, 4999)).toBe(33);
  });

  it("is zero when there is no real discount", () => {
    expect(discountPercent(5000, null)).toBe(0);
    expect(discountPercent(5000, undefined)).toBe(0);
    expect(discountPercent(5000, 5000)).toBe(0);
    expect(discountPercent(5000, 4000)).toBe(0);
  });
});
