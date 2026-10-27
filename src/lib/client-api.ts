/**
 * Browser-side helper for calling the store's JSON API. Every failure is normalised into a
 * message a shopper can read plus per-field errors for forms – callers never see a throw.
 */
export type ApiFailure = {
  status: number;
  message: string;
  /** Validation errors keyed by field path, e.g. `shippingAddress.phone`. */
  fieldErrors: Record<string, string>;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

const NETWORK_ERROR = "We couldn't reach the server. Check your connection and try again.";

export async function apiRequest<T>(url: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch {
    return { ok: false, error: { status: 0, message: NETWORK_ERROR, fieldErrors: {} } };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON body (e.g. a proxy error page) – handled below.
  }

  if (response.ok) return { ok: true, data: payload as T };

  const error = (payload as { error?: { message?: unknown; details?: unknown } } | null)?.error;
  const fieldErrors: Record<string, string> = {};
  const issues = (error?.details as { issues?: unknown } | undefined)?.issues;
  if (Array.isArray(issues)) {
    for (const issue of issues) {
      const { path, message } = (issue ?? {}) as { path?: unknown; message?: unknown };
      if (typeof path === "string" && typeof message === "string" && !(path in fieldErrors)) {
        fieldErrors[path] = message;
      }
    }
  }

  return {
    ok: false,
    error: {
      status: response.status,
      message:
        typeof error?.message === "string" && error.message
          ? error.message
          : "Something went wrong. Please try again.",
      fieldErrors,
    },
  };
}

/** Only allow redirects to paths inside this site (blocks `//evil.com` and `/\evil.com`). */
export function safeNextPath(value: string | string[] | null | undefined, fallback = "/account"): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
  for (const char of candidate) {
    if (char.charCodeAt(0) < 32) return fallback;
  }
  return candidate;
}
