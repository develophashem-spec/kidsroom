import "server-only";

/**
 * Environment access. Values are read lazily (at call time, never at import time) so
 * `next build` works without any secrets present.
 */

const DEV_MONGODB_URI = "mongodb://127.0.0.1:27017/thefit";
// Only ever used outside production so a fresh clone runs without configuration.
const DEV_AUTH_SECRET = "dev-only-insecure-secret-do-not-use-in-production-0123456789";

const isProduction = () => process.env.NODE_ENV === "production";

export function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (uri) return uri;
  if (isProduction()) {
    throw new Error("MONGODB_URI is not set. Provide a MongoDB connection string.");
  }
  return DEV_MONGODB_URI;
}

/** The key used to sign session cookies. Production requires a strong explicit secret. */
export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) {
    if (isProduction() && secret.length < 32) {
      throw new Error("AUTH_SECRET must be at least 32 characters long.");
    }
    return new TextEncoder().encode(secret);
  }
  if (isProduction()) {
    throw new Error("AUTH_SECRET is not set. Generate one with `openssl rand -base64 48`.");
  }
  return new TextEncoder().encode(DEV_AUTH_SECRET);
}
