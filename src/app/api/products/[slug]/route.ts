import { ApiError, jsonOk, withApi } from "@/lib/api";
import { getProductBySlug } from "@/lib/catalog";

export const GET = withApi(async (_request, { params }: RouteContext<"/api/products/[slug]">) => {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) throw new ApiError(404, "Product not found");
  return jsonOk({ product });
});
