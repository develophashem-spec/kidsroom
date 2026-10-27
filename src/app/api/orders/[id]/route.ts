import { ApiError, jsonOk, withApi } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { getOrderForUser } from "@/lib/orders";

export const GET = withApi(async (request, { params }: RouteContext<"/api/orders/[id]">) => {
  const user = await requireUser(request);
  const { id } = await params;
  const order = await getOrderForUser(user.id, id);
  if (!order) throw new ApiError(404, "Order not found");
  return jsonOk({ order });
});
