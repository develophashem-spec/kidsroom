import { ApiError, jsonOk, parseBody, withApi } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";
import { deleteProduct, getProductByIdForAdmin, updateProduct } from "@/lib/catalog";
import { productInputSchema } from "@/lib/validation";

export const GET = withApi(async (request, { params }: RouteContext<"/api/admin/products/[id]">) => {
  await requireAdmin(request);
  const { id } = await params;
  const product = await getProductByIdForAdmin(id);
  if (!product) throw new ApiError(404, "Product not found");
  return jsonOk({ product });
});

export const PUT = withApi(async (request, { params }: RouteContext<"/api/admin/products/[id]">) => {
  await requireAdmin(request);
  const { id } = await params;
  const input = await parseBody(request, productInputSchema, 128 * 1024);
  return jsonOk({ product: await updateProduct(id, input) });
});

export const DELETE = withApi(
  async (request, { params }: RouteContext<"/api/admin/products/[id]">) => {
    await requireAdmin(request);
    const { id } = await params;
    await deleteProduct(id);
    return jsonOk({ ok: true });
  },
);
