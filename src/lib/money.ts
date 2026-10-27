import { siteConfig } from "@/config/site";

/** The largest price (in minor units) the store accepts for a single item. */
export const MAX_PRICE_CENTS = 10_000_000;

/**
 * Money is stored and transferred as integer minor units (cents) so totals never
 * suffer from floating point rounding. Use this helper to display an amount.
 */
export function formatMoney(
  cents: number,
  options: { currency?: string; locale?: string } = {},
): string {
  const currency = options.currency ?? siteConfig.currency;
  const locale = options.locale ?? siteConfig.locale;
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    // An invalid currency / locale in the environment must never break the page.
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Convert a decimal amount typed by a person (e.g. "49.90") or a number into
 * integer cents. Returns `null` for anything that is not a sane, non-negative
 * amount with at most two decimals.
 */
export function parseMoneyToCents(input: string | number): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) return null;
    const cents = Math.round(input * 100);
    if (Math.abs(input * 100 - cents) > 1e-6 || cents > MAX_PRICE_CENTS) return null;
    return cents;
  }
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents > MAX_PRICE_CENTS ? null : cents;
}

/** Integer cents -> plain decimal string for form inputs, e.g. 4990 -> "49.90". */
export function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Percentage saved when `compareAt` is higher than `price`; `0` otherwise. */
export function discountPercent(price: number, compareAt: number | null | undefined): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
