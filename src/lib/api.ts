import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType, type z } from "zod";
import { rateLimit, type RateLimitOptions } from "@/lib/rate-limit";
import { toValidationIssues } from "@/lib/validation";

/** An error that is safe to show to the caller: it carries the HTTP status to answer with. */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;
  readonly headers?: Record<string, string>;

  constructor(
    status: number,
    message: string,
    details?: unknown,
    headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.headers = headers;
  }
}

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function jsonOk<T>(data: T, init: ResponseInit = {}): NextResponse {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", NO_STORE["Cache-Control"]);
  return NextResponse.json(data, { ...init, headers });
}

export function jsonError(
  status: number,
  message: string,
  details?: unknown,
  init: ResponseInit = {},
): NextResponse {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", NO_STORE["Cache-Control"]);
  return NextResponse.json(
    { error: details === undefined ? { message } : { message, details } },
    { ...init, status, headers },
  );
}

export function validationError(error: ZodError): ApiError {
  const issues = toValidationIssues(error);
  return new ApiError(400, issues[0]?.message ?? "Invalid request", { issues });
}

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

/** Reads a JSON body with a size cap. Throws 400 / 413 for bad or oversized input. */
export async function readJson(
  request: Request,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<unknown> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ApiError(413, "Request body is too large");
  }
  const text = await request.text();
  if (text.length > maxBytes) throw new ApiError(413, "Request body is too large");
  if (!text.trim()) throw new ApiError(400, "Request body is required");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
}

/** Reads the JSON body and validates it against a zod schema. */
export async function parseBody<S extends ZodType>(
  request: Request,
  schema: S,
  maxBytes?: number,
): Promise<z.output<S>> {
  const body = await readJson(request, maxBytes);
  const result = schema.safeParse(body);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence in depth (the session cookie is also SameSite=Lax): browsers always send
 * an `Origin` header on cross-site writes, so refuse state-changing requests whose origin
 * differs from the host they were sent to. Requests without `Origin` (curl, server-to-
 * server) are not browser CSRF vectors and are allowed.
 */
export function assertSameOrigin(request: Request): void {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return;
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = null;
  }
  if (!host || originHost !== host) {
    throw new ApiError(403, "Cross-site request blocked");
  }
}

/** Best-effort client IP for rate limiting (only trustworthy behind a proxy you control). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || request.headers.get("x-real-ip")?.trim();
  return candidate ? candidate.slice(0, 64) : "unknown";
}

/** Counts one hit against `key` and throws a 429 (with `Retry-After`) once the limit is hit. */
export function enforceRateLimit(key: string, options: RateLimitOptions): void {
  const result = rateLimit(key, options);
  if (!result.ok) {
    throw new ApiError(429, "Too many requests. Please wait a moment and try again.", undefined, {
      "Retry-After": String(result.retryAfterSeconds),
    });
  }
}

const DATABASE_UNAVAILABLE = new Set([
  "MongooseServerSelectionError",
  "MongoServerSelectionError",
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
]);

type Handler<Ctx> = (request: NextRequest, context: Ctx) => Promise<Response> | Response;

/**
 * Wraps a route handler: enforces same-origin writes and turns thrown errors into JSON
 * responses (`ApiError` → its status, validation errors → 400, database outages → 503,
 * anything else → a generic 500 that never leaks internals).
 */
export function withApi<Ctx = unknown>(handler: Handler<Ctx>) {
  return async (request: NextRequest, context: Ctx): Promise<Response> => {
    try {
      assertSameOrigin(request);
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonError(error.status, error.message, error.details, { headers: error.headers });
      }
      if (error instanceof ZodError) {
        const apiError = validationError(error);
        return jsonError(apiError.status, apiError.message, apiError.details);
      }
      if (error instanceof Error && DATABASE_UNAVAILABLE.has(error.name)) {
        console.error("[api] database unavailable:", error.message);
        return jsonError(503, "The store is temporarily unavailable. Please try again shortly.");
      }
      console.error("[api] unexpected error:", error);
      return jsonError(500, "Something went wrong. Please try again.");
    }
  };
}
