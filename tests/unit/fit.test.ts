import { describe, expect, it } from "vitest";
import {
  parseFitProfile,
  recommendSize,
  validateMeasurements,
  type FitInput,
} from "@/lib/fit";

const base: FitInput = { gender: "men", heightCm: 178, weightKg: 75, preference: "regular" };

describe("recommendSize", () => {
  it("returns the reference size for a reference body and a regular cut", () => {
    const result = recommendSize(base);
    expect(result.size).toBe("M");
    expect(result.alternate).toBeNull();
    expect(result.score).toBeCloseTo(2, 5);
  });

  it("uses different scales for men and women", () => {
    const men = recommendSize({ ...base, weightKg: 61, heightCm: 165 });
    const women = recommendSize({ ...base, gender: "women", weightKg: 61, heightCm: 165 });
    expect(women.size).toBe("M");
    expect(["XS", "S"]).toContain(men.size);
  });

  it("recommends a bigger size for heavier and taller people", () => {
    const light = recommendSize({ ...base, weightKg: 62 });
    const heavy = recommendSize({ ...base, weightKg: 100 });
    expect(heavy.score).toBeGreaterThan(light.score);
    expect(heavy.size).toBe("XL");

    const short = recommendSize({ ...base, heightCm: 165 });
    const tall = recommendSize({ ...base, heightCm: 195 });
    expect(tall.score).toBeGreaterThan(short.score);
  });

  it("sizes up when the wearer likes it looser than the garment is cut", () => {
    const regular = recommendSize({ ...base, weightKg: 70 });
    const loose = recommendSize({ ...base, weightKg: 70, preference: "loose" });
    expect(loose.score).toBeGreaterThan(regular.score);
    expect(loose.notes.join(" ")).toMatch(/larger size/);
  });

  it("sizes down for an oversized garment and up for a slim one", () => {
    const oversized = recommendSize({ ...base, productFit: "oversized" });
    const slim = recommendSize({ ...base, productFit: "slim" });
    expect(oversized.score).toBeCloseTo(1, 5);
    expect(oversized.size).toBe("S");
    expect(slim.score).toBeCloseTo(2.5, 5);
    expect(slim.size).toBe("L");
    expect(slim.alternate).toBe("M");
    expect(oversized.notes.join(" ")).toMatch(/smaller size/);
    expect(slim.notes.join(" ")).toMatch(/larger size/);
  });

  it("offers the neighbouring size when between two sizes", () => {
    // 80 kg sits half-way between M (75 kg) and L (85 kg)
    const result = recommendSize({ ...base, weightKg: 80 });
    expect(result.size).toBe("L");
    expect(result.alternate).toBe("M");

    const slightlyAboveM = recommendSize({ ...base, weightKg: 77 });
    expect(slightlyAboveM.size).toBe("M");
    expect(slightlyAboveM.alternate).toBe("L");

    const slightlyBelowM = recommendSize({ ...base, weightKg: 73 });
    expect(slightlyBelowM.size).toBe("M");
    expect(slightlyBelowM.alternate).toBe("S");

    const centred = recommendSize({ ...base, weightKg: 76 });
    expect(centred.size).toBe("M");
    expect(centred.alternate).toBeNull();
  });

  it("never leaves the XS-XXL range and says so at the extremes", () => {
    const tiny = recommendSize({ ...base, weightKg: 30, heightCm: 130, preference: "snug" });
    expect(tiny.size).toBe("XS");
    expect(tiny.alternate).toBeNull();
    expect(tiny.notes.join(" ")).toMatch(/small end/);

    const huge = recommendSize({ ...base, weightKg: 250, heightCm: 230, preference: "loose" });
    expect(huge.size).toBe("XXL");
    expect(huge.alternate).toBeNull();
    expect(huge.notes.join(" ")).toMatch(/large end/);
  });
});

describe("validateMeasurements", () => {
  it("accepts sensible measurements", () => {
    expect(validateMeasurements(170, 65)).toBeNull();
    expect(validateMeasurements(130, 30)).toBeNull();
    expect(validateMeasurements(230, 250)).toBeNull();
  });

  it("rejects out of range, missing and non-finite values", () => {
    expect(validateMeasurements(100, 65)).toMatch(/height/i);
    expect(validateMeasurements(300, 65)).toMatch(/height/i);
    expect(validateMeasurements(170, 10)).toMatch(/weight/i);
    expect(validateMeasurements(170, 900)).toMatch(/weight/i);
    expect(validateMeasurements(Number.NaN, 65)).toMatch(/height/i);
    expect(validateMeasurements(170, Number.POSITIVE_INFINITY)).toMatch(/weight/i);
  });
});

describe("parseFitProfile", () => {
  const valid = { gender: "women", heightCm: 168, weightKg: 60, preference: "snug" };

  it("accepts a valid profile", () => {
    expect(parseFitProfile(valid)).toEqual(valid);
  });

  it("drops unknown properties", () => {
    expect(parseFitProfile({ ...valid, extra: "x" })).toEqual(valid);
  });

  it.each([
    null,
    undefined,
    "string",
    42,
    [],
    { ...valid, gender: "kids" },
    { ...valid, heightCm: "168" },
    { ...valid, weightKg: 5 },
    { ...valid, preference: "tight" },
  ])("rejects %j", (value) => {
    expect(parseFitProfile(value)).toBeNull();
  });
});
