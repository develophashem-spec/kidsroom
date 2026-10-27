import { ApiError, jsonOk, parseBody, withApi } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";
import { getOrderForAdmin, updateOrderStatus } from "@/lib/orders";
import { orderStatusUpdateSchema } from "@/lib/validation";

export const GET = withApi(async (request, { params }: RouteContext<"/api/admin/orders/[id]">) => {
  await requireAdmin(request);
  const { id } = await params;
  const order = await getOrderForAdmin(id);
  if (!order) throw new ApiError(404, "Order not found");
  return jsonOk({ order });
});

/** Body: `{ "status": "confirmed" | "shipped" | "delivered" | "cancelled" }`. */
export const PATCH = withApi(async (request, { params }: RouteContext<"/api/admin/orders/[id]">) => {
  await requireAdmin(request);
  const { id } = await params;
  const { status } = await parseBody(request, orderStatusUpdateSchema);
  return jsonOk({ order: await updateOrderStatus(id, status) });
});
