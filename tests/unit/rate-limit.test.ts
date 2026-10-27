import { beforeEach, describe, expect, it } from "vitest";
import { clearAllRateLimits, rateLimit, resetRateLimit } from "@/lib/rate-limit";

const options = { limit: 3, windowMs: 1000 };

beforeEach(() => clearAllRateLimits());

describe("rateLimit", () => {
  it("allows up to the limit and then blocks, reporting retry time", () => {
    const results = [0, 1, 2, 3, 4].map(() => rateLimit("k", options, 10_000));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0, 0]);
    expect(results[3].retryAfterSeconds).toBe(1);
  });

  it("starts a fresh window once the old one has expired", () => {
    for (let i = 0; i < 5; i += 1) rateLimit("k", options, 10_000);
    expect(rateLimit("k", options, 10_999).ok).toBe(false);
    expect(rateLimit("k", options, 11_000).ok).toBe(true);
  });

  it("tracks keys independently and can be reset", () => {
    for (let i = 0; i < 4; i += 1) rateLimit("a", options, 0);
    expect(rateLimit("a", options, 0).ok).toBe(false);
    expect(rateLimit("b", options, 0).ok).toBe(true);
    resetRateLimit("a");
    expect(rateLimit("a", options, 0).ok).toBe(true);
  });
});
