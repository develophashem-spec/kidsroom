/**
 * Store-wide settings that are safe to use on both the server and the client.
 *
 * Everything here can be overridden with `NEXT_PUBLIC_*` environment variables
 * (see `.env.example`). Note that `NEXT_PUBLIC_*` values are inlined at build time.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_STORE_NAME?.trim() || "The Fit Store",
  tagline: "Menswear & womenswear that fits the way you want it to.",
  description:
    "Shop stylish men's and women's fashion online. Find your perfect fit with our size finder, order in minutes and pay on delivery.",
  currency: process.env.NEXT_PUBLIC_CURRENCY?.trim().toUpperCase() || "USD",
  locale: process.env.NEXT_PUBLIC_LOCALE?.trim() || "en-US",
} as const;

function intFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Shipping fees in minor units (cents). Orders at or above the threshold ship free. */
export const shippingConfig = {
  flatRate: intFromEnv(process.env.NEXT_PUBLIC_SHIPPING_FLAT_CENTS, 800),
  freeThreshold: intFromEnv(process.env.NEXT_PUBLIC_FREE_SHIPPING_CENTS, 10000),
} as const;

/** Limits that protect the cart / order endpoints from abusive payloads. */
export const cartLimits = {
  maxQuantityPerLine: 10,
  maxLines: 50,
} as const;
