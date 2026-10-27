import { jsonOk, parseBody, withApi } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";
import { createProduct, listProductsForAdmin } from "@/lib/catalog";
import { adminProductListSchema, productInputSchema } from "@/lib/validation";

export const GET = withApi(async (request) => {
  await requireAdmin(request);
  const { page, q } = adminProductListSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  return jsonOk(await listProductsForAdmin({ page, q }));
});

export const POST = withApi(async (request) => {
  await requireAdmin(request);
  const input = await parseBody(request, productInputSchema, 128 * 1024);
  return jsonOk({ product: await createProduct(input) }, { status: 201 });
});
