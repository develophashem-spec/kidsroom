import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, safeNextPath } from "@/lib/client-api";

describe("safeNextPath", () => {
  it("keeps in-site paths, including query strings", () => {
    expect(safeNextPath("/checkout")).toBe("/checkout");
    expect(safeNextPath("/account/orders/123?placed=1")).toBe("/account/orders/123?placed=1");
  });

  it("falls back for anything that could leave the site", () => {
    for (const unsafe of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "evil.example",
      "/ok\nSet-Cookie: a=b",
      "",
    ]) {
      expect(safeNextPath(unsafe)).toBe("/account");
    }
    expect(safeNextPath(undefined)).toBe("/account");
    expect(safeNextPath(null, "/")).toBe("/");
  });

  it("uses the first value when the parameter is repeated", () => {
    expect(safeNextPath(["/cart", "https://evil.example"])).toBe("/cart");
    expect(safeNextPath(["https://evil.example", "/cart"])).toBe("/account");
  });
});

describe("apiRequest", () => {
  afterEach(() => vi.unstubAllGlobals());

  const respond = (status: number, body: unknown) =>
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
      ),
    );

  it("returns the parsed body on success and sends JSON", async () => {
    respond(200, { quote: { total: 1 } });
    const result = await apiRequest<{ quote: { total: number } }>("/api/cart/quote", {
      body: { lines: [] },
    });
    expect(result).toEqual({ ok: true, data: { quote: { total: 1 } } });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe('{"lines":[]}');
  });

  it("maps validation issues to field errors (first message per path wins)", async () => {
    respond(400, {
      error: {
        message: "Please check the highlighted fields",
        details: {
          issues: [
            { path: "shippingAddress.phone", message: "Enter a phone number" },
            { path: "shippingAddress.phone", message: "Too short" },
            { path: "notes", message: "Too long" },
            { path: 5, message: "ignored" },
          ],
        },
      },
    });
    const result = await apiRequest("/api/orders", { body: {} });
    expect(result).toEqual({
      ok: false,
      error: {
        status: 400,
        message: "Please check the highlighted fields",
        fieldErrors: { "shippingAddress.phone": "Enter a phone number", notes: "Too long" },
      },
    });
  });

  it("copes with non-JSON error responses", async () => {
    respond(502, "<html>Bad gateway</html>");
    const result = await apiRequest("/api/health");
    expect(result).toMatchObject({
      ok: false,
      error: { status: 502, message: "Something went wrong. Please try again." },
    });
  });

  it("reports network failures without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const result = await apiRequest("/api/health");
    expect(result).toMatchObject({ ok: false, error: { status: 0 } });
  });
});
