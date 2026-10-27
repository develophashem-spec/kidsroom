import "server-only";
import { cartLimits, shippingConfig } from "@/config/site";
import { mergeLines } from "@/lib/cart-utils";
import { connectDB } from "@/lib/db";
import { calculateTotals } from "@/lib/pricing";
import type { QuoteDTO, QuoteLineDTO } from "@/lib/types";
import type { CartLineInput } from "@/lib/validation";
import { Product } from "@/models";

const emptyQuote = (): QuoteDTO => ({
  lines: [],
  subtotal: 0,
  shipping: 0,
  total: 0,
  freeShippingThreshold: shippingConfig.freeThreshold,
  hasIssues: false,
});

/**
 * Prices a cart from the database. The client only ever sends product ids, sizes, colours
 * and quantities – names, prices and stock always come from here, never from the browser.
 * Only lines that can be fulfilled (`status: "ok"`) count towards the totals.
 */
export async function quoteCart(lines: readonly CartLineInput[]): Promise<QuoteDTO> {
  const merged = mergeLines(lines);
  if (merged.length === 0) return emptyQuote();

  await connectDB();
  const ids = [...new Set(merged.map((line) => line.productId))];
  const products = await Product.find({ _id: { $in: ids }, isActive: true }).lean();
  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  const quoted = merged.map((line): QuoteLineDTO => {
    const product = byId.get(line.productId);
    const variant = product?.variants.find(
      (candidate) => candidate.size === line.size && candidate.color === line.color,
    );

    if (!product || !variant) {
      return {
        productId: line.productId,
        slug: product?.slug ?? "",
        name: product?.name ?? "Unavailable item",
        category: product?.category ?? "accessories",
        image: null,
        size: line.size,
        color: line.color,
        colorHex: "#d4d0c8",
        unitPrice: 0,
        quantity: line.quantity,
        lineTotal: 0,
        available: 0,
        status: "unavailable",
      };
    }

    const available = Math.min(variant.stock, cartLimits.maxQuantityPerLine);
    const status =
      available === 0 ? "out_of_stock" : line.quantity > available ? "insufficient" : "ok";
    const colorHex = product.colors.find((color) => color.name === line.color)?.hex ?? "#d4d0c8";

    return {
      productId: line.productId,
      slug: product.slug,
      name: product.name,
      category: product.category,
      image: product.images[0] ?? null,
      size: line.size,
      color: line.color,
      colorHex,
      unitPrice: product.price,
      quantity: line.quantity,
      lineTotal: product.price * line.quantity,
      available,
      status,
    };
  });

  const subtotal = quoted.reduce(
    (sum, line) => (line.status === "ok" ? sum + line.lineTotal : sum),
    0,
  );

  return {
    lines: quoted,
    ...calculateTotals(subtotal),
    freeShippingThreshold: shippingConfig.freeThreshold,
    hasIssues: quoted.some((line) => line.status !== "ok"),
  };
}
