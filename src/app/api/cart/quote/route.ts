import { enforceRateLimit, getClientIp, jsonOk, parseBody, withApi } from "@/lib/api";
import { quoteCart } from "@/lib/cart";
import { cartQuoteSchema } from "@/lib/validation";

/** Prices a cart server-side (names, prices, stock). Body: `{ lines: [{productId,size,color,quantity}] }`. */
export const POST = withApi(async (request) => {
  enforceRateLimit(`quote:${getClientIp(request)}`, { limit: 120, windowMs: 60 * 1000 });
  const { lines } = await parseBody(request, cartQuoteSchema);
  return jsonOk({ quote: await quoteCart(lines) });
});
