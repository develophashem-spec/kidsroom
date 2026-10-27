import { enforceRateLimit, getClientIp, jsonOk, parseBody, withApi } from "@/lib/api";
import { authenticate } from "@/lib/accounts";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { resetRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

const WINDOW_MS = 15 * 60 * 1000;

export const POST = withApi(async (request) => {
  enforceRateLimit(`login:ip:${getClientIp(request)}`, { limit: 30, windowMs: WINDOW_MS });

  const input = await parseBody(request, loginSchema);
  const emailKey = `login:email:${input.email}`;
  enforceRateLimit(emailKey, { limit: 8, windowMs: WINDOW_MS });

  const user = await authenticate(input);
  resetRateLimit(emailKey);

  const response = jsonOk({ user });
  response.cookies.set(SESSION_COOKIE, await signSession(user.id, user.role), sessionCookieOptions());
  return response;
});
