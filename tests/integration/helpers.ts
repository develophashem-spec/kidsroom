import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { connectDB, disconnectDB, ensureIndexes } from "@/lib/db";
import { clearAllRateLimits } from "@/lib/rate-limit";
import { Product, User, type ProductAttrs } from "@/models";

export const ORIGIN = "http://localhost:3000";

/** Connects, wipes the (disposable) test database and rebuilds the indexes. */
export async function resetDatabase(): Promise<void> {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
  clearAllRateLimits();
}

export async function closeDatabase(): Promise<void> {
  await disconnectDB();
}

type Handler = (request: NextRequest, context: never) => Promise<Response> | Response;

export type CallOptions = {
  method?: string;
  query?: Record<string, string>;
  body?: unknown;
  rawBody?: string;
  cookie?: string | null;
  headers?: Record<string, string>;
  params?: Record<string, string>;
};

// Response bodies are inspected dynamically in the tests; a loose JSON type keeps assertions readable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export type CallResult<T = Json> = { status: number; json: T; headers: Headers; response: Response };

/** Invokes a route handler directly, the same way Next.js would. */
export async function call<T = Json>(
  handler: Handler,
  path: string,
  options: CallOptions = {},
): Promise<CallResult<T>> {
  const url = new URL(path, ORIGIN);
  for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value);

  const hasBody = options.body !== undefined || options.rawBody !== undefined;
  const method = options.method ?? (hasBody ? "POST" : "GET");
  const headers = new Headers({ host: "localhost:3000", ...options.headers });
  if (options.cookie) headers.set("cookie", options.cookie);
  let body: string | undefined;
  if (options.rawBody !== undefined) body = options.rawBody;
  else if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers.set("content-type", "application/json");
  }

  const request = new NextRequest(url, { method, headers, body });
  const response = await handler(request, { params: Promise.resolve(options.params ?? {}) } as never);
  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: response.status, json: json as T, headers: response.headers, response };
}

/** Extracts `tf_session=<jwt>` from a Set-Cookie header so it can be replayed as a Cookie. */
export function sessionCookieFrom(result: CallResult): string | null {
  for (const header of result.headers.getSetCookie()) {
    const match = new RegExp(`^${SESSION_COOKIE}=([^;]*)`).exec(header);
    if (match && match[1]) return `${SESSION_COOKIE}=${match[1]}`;
  }
  return null;
}

export const PASSWORD = "correct-horse-battery";

let counter = 0;

/** Registers a customer through the real API and returns their cookie. */
export async function registerCustomer(
  register: Handler,
  overrides: { name?: string; email?: string; password?: string } = {},
) {
  counter += 1;
  const email = overrides.email ?? `customer${counter}@example.com`;
  const result = await call(register, "/api/auth/register", {
    body: { name: overrides.name ?? `Customer ${counter}`, email, password: overrides.password ?? PASSWORD },
  });
  const cookie = sessionCookieFrom(result);
  if (result.status !== 201 || !cookie) {
    throw new Error(`register failed: ${result.status} ${JSON.stringify(result.json)}`);
  }
  return { cookie, user: result.json.user as { id: string; email: string; name: string; role: string }, email };
}

/** Inserts an admin straight into the database (admins cannot self-register) and signs in. */
export async function createAdmin(login: Handler) {
  counter += 1;
  const email = `admin${counter}@example.com`;
  await connectDB();
  await User.create({
    name: "Admin",
    email,
    passwordHash: await hashPassword(PASSWORD),
    role: "admin",
  });
  const result = await call(login, "/api/auth/login", { body: { email, password: PASSWORD } });
  const cookie = sessionCookieFrom(result);
  if (!cookie) throw new Error(`admin login failed: ${result.status}`);
  return { cookie, email };
}

export type ProductSeed = Partial<Omit<ProductAttrs, "createdAt" | "updatedAt">>;

let productCounter = 0;

/** Inserts a product directly into the database. Defaults to a men's shirt with M/L in stock. */
export async function createProduct(overrides: ProductSeed = {}) {
  productCounter += 1;
  await connectDB();
  const created = await Product.create({
    name: `Test Shirt ${productCounter}`,
    slug: `test-shirt-${productCounter}`,
    description: "A shirt for testing.",
    details: [],
    department: "men",
    category: "shirts",
    fit: "regular",
    price: 5000,
    compareAtPrice: null,
    colors: [{ name: "Navy", hex: "#1f2a44" }],
    images: [],
    variants: [
      { size: "M", color: "Navy", stock: 5 },
      { size: "L", color: "Navy", stock: 5 },
    ],
    tags: [],
    featured: false,
    isActive: true,
    ...overrides,
  });
  return created.toObject();
}

export async function stockOf(productId: string, size: string, color: string): Promise<number> {
  const product = await Product.findById(productId).lean();
  return product?.variants.find((v) => v.size === size && v.color === color)?.stock ?? -1;
}
