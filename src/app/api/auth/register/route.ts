import { enforceRateLimit, getClientIp, jsonOk, parseBody, withApi } from "@/lib/api";
import { registerUser } from "@/lib/accounts";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validation";

export const POST = withApi(async (request) => {
  enforceRateLimit(`register:${getClientIp(request)}`, { limit: 10, windowMs: 60 * 60 * 1000 });

  const input = await parseBody(request, registerSchema);
  const user = await registerUser(input);

  const response = jsonOk({ user }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, await signSession(user.id, user.role), sessionCookieOptions());
  return response;
});
