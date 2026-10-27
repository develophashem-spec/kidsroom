import { jsonOk, withApi } from "@/lib/api";
import { listProducts } from "@/lib/catalog";
import { parseProductFilters } from "@/lib/validation";

/**
 * GET /api/products?department=men&category=shirts&size=M&color=Navy&fit=slim
 *                  &minPrice=20&maxPrice=80&q=oxford&sort=price-asc&page=1&limit=12
 * Prices are plain amounts (e.g. 49.90). Invalid filter values are ignored.
 */
export const GET = withApi(async (request) => {
  const filters = parseProductFilters(request.nextUrl.searchParams);
  return jsonOk(await listProducts(filters));
});
