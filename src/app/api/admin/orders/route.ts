import { jsonOk, withApi } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";
import { listOrdersForAdmin } from "@/lib/orders";
import { adminOrderListSchema } from "@/lib/validation";

export const GET = withApi(async (request) => {
  await requireAdmin(request);
  const { page, status } = adminOrderListSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  return jsonOk(await listOrdersForAdmin({ page, status }));
});
