import { jsonOk, withApi } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/auth/session";

export const POST = withApi(async () => {
  const response = jsonOk({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
});
