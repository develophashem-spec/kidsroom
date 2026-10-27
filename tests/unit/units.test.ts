import { describe, expect, it } from "vitest";
import { cmToFeetInches, feetInchesToCm, kgToPounds, poundsToKg } from "@/lib/units";

describe("units", () => {
  it("converts feet and inches to centimetres", () => {
    expect(feetInchesToCm(5, 7)).toBeCloseTo(170.18, 2);
    expect(feetInchesToCm(6, 0)).toBeCloseTo(182.88, 2);
    expect(feetInchesToCm(0, 0)).toBe(0);
  });

  it("converts centimetres back to the nearest foot and inch", () => {
    expect(cmToFeetInches(170)).toEqual({ feet: 5, inches: 7 });
    expect(cmToFeetInches(182.88)).toEqual({ feet: 6, inches: 0 });
    // 11.6 inches rounds up into the next foot rather than showing 12 in.
    expect(cmToFeetInches(5 * 30.48 + 11.6 * 2.54)).toEqual({ feet: 6, inches: 0 });
  });

  it("converts pounds and kilograms", () => {
    expect(poundsToKg(150)).toBeCloseTo(68.04, 2);
    expect(kgToPounds(68.04)).toBeCloseTo(150, 0);
    expect(kgToPounds(poundsToKg(180))).toBeCloseTo(180, 6);
  });
});
