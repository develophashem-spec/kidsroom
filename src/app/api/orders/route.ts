import { enforceRateLimit, jsonOk, parseBody, withApi } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { createOrder, listOrdersForUser } from "@/lib/orders";
import { createOrderSchema, parsePage } from "@/lib/validation";

export const GET = withApi(async (request) => {
  const user = await requireUser(request);
  const page = parsePage(request.nextUrl.searchParams.get("page"));
  return jsonOk(await listOrdersForUser(user.id, { page }));
});

export const POST = withApi(async (request) => {
  const user = await requireUser(request);
  enforceRateLimit(`order:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  const input = await parseBody(request, createOrderSchema, 32 * 1024);
  const order = await createOrder(user.id, input);
  return jsonOk({ order }, { status: 201 });
});
