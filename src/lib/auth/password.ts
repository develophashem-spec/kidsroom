import "server-only";
import bcrypt from "bcryptjs";

/** bcrypt cost factor. Production always uses at least 10, whatever the environment says. */
function rounds(): number {
  const configured = Number.parseInt(process.env.BCRYPT_ROUNDS ?? "", 10);
  if (process.env.NODE_ENV === "production") return Math.max(10, configured || 11);
  return Number.isFinite(configured) && configured >= 4 ? configured : 11;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, rounds());
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | undefined;

/**
 * Compares against a throw-away hash so a login attempt for an unknown email costs the
 * same time as one for a known email (no user enumeration through response timing).
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("not-a-real-password");
  await bcrypt.compare(password, await dummyHash);
}
