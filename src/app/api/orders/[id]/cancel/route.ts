import { jsonOk, withApi } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { cancelOrder } from "@/lib/orders";

/** Customers can cancel their own order while it is still pending; items go back in stock. */
export const POST = withApi(
  async (request, { params }: RouteContext<"/api/orders/[id]/cancel">) => {
    const user = await requireUser(request);
    const { id } = await params;
    const order = await cancelOrder(id, { id: user.id, role: "customer" });
    return jsonOk({ order });
  },
);
