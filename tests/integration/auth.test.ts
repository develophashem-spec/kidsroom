import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as register } from "@/app/api/auth/register/route";
import { SESSION_COOKIE, signSession } from "@/lib/auth/session";
import { clearAllRateLimits } from "@/lib/rate-limit";
import { User } from "@/models";
import {
  PASSWORD,
  call,
  closeDatabase,
  registerCustomer,
  resetDatabase,
  sessionCookieFrom,
} from "./helpers";

beforeAll(resetDatabase);
afterAll(closeDatabase);
beforeEach(() => clearAllRateLimits());

describe("POST /api/auth/register", () => {
  it("creates a customer, hashes the password and signs them in", async () => {
    const result = await call(register, "/api/auth/register", {
      body: { name: "  Ada Lovelace ", email: "Ada@Example.com ", password: PASSWORD },
    });

    expect(result.status).toBe(201);
    expect(result.json.user).toMatchObject({ name: "Ada Lovelace", email: "ada@example.com", role: "customer" });
    expect(result.json.user).not.toHaveProperty("passwordHash");

    const setCookie = result.headers.getSetCookie().join("\n");
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");

    const stored = await User.findOne({ email: "ada@example.com" }).select("+passwordHash").lean();
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored?.passwordHash).not.toContain(PASSWORD);
  });

  it("never lets a caller choose their own role", async () => {
    const result = await call(register, "/api/auth/register", {
      body: { name: "Mallory", email: "mallory@example.com", password: PASSWORD, role: "admin" },
    });
    expect(result.status).toBe(201);
    expect(result.json.user.role).toBe("customer");
  });

  it("rejects a duplicate email regardless of case", async () => {
    await registerCustomer(register, { email: "dupe@example.com" });
    const result = await call(register, "/api/auth/register", {
      body: { name: "Other", email: "DUPE@example.com", password: PASSWORD },
    });
    expect(result.status).toBe(409);
  });

  it.each([
    [{ name: "", email: "a@example.com", password: PASSWORD }, /name/i],
    [{ name: "A", email: "not-an-email", password: PASSWORD }, /email/i],
    [{ name: "A", email: "a@example.com", password: "short" }, /8 characters/i],
    [{ name: "A", email: "a@example.com", password: "x".repeat(80) }, /72/],
  ])("validates the body %#", async (body, message) => {
    const result = await call(register, "/api/auth/register", { body });
    expect(result.status).toBe(400);
    expect(result.json.error.message).toMatch(message);
  });

  it("rejects malformed JSON and oversized bodies", async () => {
    expect((await call(register, "/api/auth/register", { rawBody: "{nope" })).status).toBe(400);
    expect((await call(register, "/api/auth/register", { rawBody: "" })).status).toBe(400);
    const huge = JSON.stringify({ name: "x".repeat(100_000), email: "a@example.com", password: PASSWORD });
    expect((await call(register, "/api/auth/register", { rawBody: huge })).status).toBe(413);
  });

  it("blocks cross-site browser requests", async () => {
    const result = await call(register, "/api/auth/register", {
      body: { name: "Eve", email: "eve@example.com", password: PASSWORD },
      headers: { origin: "https://evil.example" },
    });
    expect(result.status).toBe(403);
    expect(await User.countDocuments({ email: "eve@example.com" })).toBe(0);

    const sameSite = await call(register, "/api/auth/register", {
      body: { name: "Eve", email: "eve@example.com", password: PASSWORD },
      headers: { origin: "http://localhost:3000" },
    });
    expect(sameSite.status).toBe(201);
  });
});

describe("POST /api/auth/login", () => {
  it("signs in with correct credentials and returns the same error for bad ones", async () => {
    const { email } = await registerCustomer(register);

    const ok = await call(login, "/api/auth/login", { body: { email: email.toUpperCase(), password: PASSWORD } });
    expect(ok.status).toBe(200);
    expect(sessionCookieFrom(ok)).toBeTruthy();

    const wrongPassword = await call(login, "/api/auth/login", { body: { email, password: "wrong-password" } });
    const unknownEmail = await call(login, "/api/auth/login", { body: { email: "nobody@example.com", password: PASSWORD } });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.json).toEqual(unknownEmail.json);
    expect(sessionCookieFrom(wrongPassword)).toBeNull();
  });

  it("rate limits repeated attempts for the same account", async () => {
    const { email } = await registerCustomer(register);
    const statuses: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      const result = await call(login, "/api/auth/login", { body: { email, password: `wrong-${i}-password` } });
      statuses.push(result.status);
      if (result.status === 429) expect(Number(result.headers.get("retry-after"))).toBeGreaterThan(0);
    }
    expect(statuses.slice(0, 8)).toEqual(Array(8).fill(401));
    expect(statuses.slice(8)).toEqual([429, 429]);

    // even the right password is refused while locked out
    expect((await call(login, "/api/auth/login", { body: { email, password: PASSWORD } })).status).toBe(429);
  });
});

describe("GET /api/auth/me and logout", () => {
  it("returns the signed-in user, or null", async () => {
    const { cookie, user } = await registerCustomer(register);
    const signedIn = await call(me, "/api/auth/me", { cookie });
    expect(signedIn.json.user).toMatchObject({ id: user.id, email: user.email, role: "customer" });

    expect((await call(me, "/api/auth/me")).json.user).toBeNull();
  });

  it("ignores forged, tampered and expired session cookies", async () => {
    const { user } = await registerCustomer(register);
    const forged = `${SESSION_COOKIE}=${await signSession(user.id, "customer")}x`;
    expect((await call(me, "/api/auth/me", { cookie: forged })).json.user).toBeNull();
    expect((await call(me, "/api/auth/me", { cookie: `${SESSION_COOKIE}=garbage` })).json.user).toBeNull();

    // A validly signed token for a user that no longer exists is worthless.
    const ghost = `${SESSION_COOKIE}=${await signSession("0".repeat(24), "admin")}`;
    expect((await call(me, "/api/auth/me", { cookie: ghost })).json.user).toBeNull();
  });

  it("takes the role from the database, not from the token", async () => {
    const { cookie, user } = await registerCustomer(register);
    const elevated = `${SESSION_COOKIE}=${await signSession(user.id, "admin")}`;
    expect((await call(me, "/api/auth/me", { cookie: elevated })).json.user.role).toBe("customer");
    expect((await call(me, "/api/auth/me", { cookie })).json.user.role).toBe("customer");
  });

  it("clears the cookie on logout", async () => {
    const result = await call(logout, "/api/auth/logout", { method: "POST" });
    expect(result.status).toBe(200);
    const cleared = result.headers.getSetCookie().join("\n");
    expect(cleared).toContain(`${SESSION_COOKIE}=;`);
  });
});
