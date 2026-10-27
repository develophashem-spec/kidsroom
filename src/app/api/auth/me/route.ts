import { jsonOk, withApi } from "@/lib/api";
import { getRequestUser } from "@/lib/auth/guards";

export const GET = withApi(async (request) => {
  return jsonOk({ user: await getRequestUser(request) });
});
