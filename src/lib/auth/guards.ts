import "server-only";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api";
import { SESSION_COOKIE, loadSessionUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/types";

/** The signed-in user for an API request, or `null`. */
export function getRequestUser(request: NextRequest): Promise<SessionUser | null> {
  return loadSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function requireUser(request: NextRequest): Promise<SessionUser> {
  const user = await getRequestUser(request);
  if (!user) throw new ApiError(401, "Please sign in to continue");
  return user;
}

export async function requireAdmin(request: NextRequest): Promise<SessionUser> {
  const user = await requireUser(request);
  if (user.role !== "admin") throw new ApiError(403, "You do not have access to this resource");
  return user;
}
