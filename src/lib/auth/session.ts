import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { connectDB } from "@/lib/db";
import { getAuthSecret } from "@/lib/env";
import type { SessionUser, UserRole } from "@/lib/types";
import { User } from "@/models";

export const SESSION_COOKIE = "tf_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const ISSUER = "the-fit-store";
const OBJECT_ID = /^[a-f\d]{24}$/i;

export async function signSession(userId: string, role: UserRole): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getAuthSecret());
}

/** Returns the user id inside a valid, unexpired session token – otherwise `null`. */
export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
    });
    return typeof payload.sub === "string" && OBJECT_ID.test(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Resolves a session cookie value to the current user. The role is always read from the
 * database (not the token), so demoting or deleting a user takes effect immediately.
 */
export async function loadSessionUser(token: string | undefined): Promise<SessionUser | null> {
  const userId = await verifySession(token);
  if (!userId) return null;
  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) return null;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
