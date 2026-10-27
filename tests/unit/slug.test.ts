import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it.each([
    ["Classic Oxford Shirt", "classic-oxford-shirt"],
    ["  Spaces   everywhere  ", "spaces-everywhere"],
    ["Café Crème Knit", "cafe-creme-knit"],
    ["Black & White Tee", "black-and-white-tee"],
    ["100% Cotton / Slim-Fit!", "100-cotton-slim-fit"],
    ["---weird---", "weird"],
  ])("turns %j into %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("falls back to a placeholder when nothing usable is left", () => {
    expect(slugify("")).toBe("product");
    expect(slugify("!!!")).toBe("product");
    expect(slugify("قميص")).toBe("product");
  });

  it("limits the length without leaving a trailing dash", () => {
    const slug = slugify(`${"a".repeat(79)} b${"c".repeat(40)}`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});
