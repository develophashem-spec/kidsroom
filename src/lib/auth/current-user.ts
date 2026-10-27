import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE, loadSessionUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/types";

/**
 * Server-component auth helpers. They read the request cookies, so anything that calls them
 * must render inside a <Suspense> boundary (the page shell stays static, the user-specific
 * part streams in). API routes use `@/lib/auth/guards` instead.
 */

async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** The signed-in user (role read from the database), or `null`. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> =>
  loadSessionUser(await getSessionToken()),
);

/**
 * Like `getCurrentUser`, but a database outage means "signed out" instead of an error, so the
 * site header can still render while the database is unreachable.
 */
export async function getOptionalUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  try {
    return await loadSessionUser(token);
  } catch (error) {
    console.error("[auth] Could not load the session user", error);
    return null;
  }
}

/** Sends visitors who are not signed in to the login page, then back to `nextPath`. */
export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Admin-only pages look like they do not exist to everybody else. */
export async function requireAdminUser(nextPath: string): Promise<SessionUser> {
  const user = await requireUser(nextPath);
  if (user.role !== "admin") notFound();
  return user;
}
