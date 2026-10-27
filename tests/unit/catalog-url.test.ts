import { describe, expect, it } from "vitest";
import { buildCatalogHref, centsToUrlValue, filtersToParams } from "@/lib/catalog-url";
import { parseProductFilters } from "@/lib/validation";

const parse = (query: string) => parseProductFilters(new URLSearchParams(query));

describe("centsToUrlValue", () => {
  it("drops needless decimals", () => {
    expect(centsToUrlValue(5000)).toBe("50");
    expect(centsToUrlValue(4990)).toBe("49.9");
    expect(centsToUrlValue(4905)).toBe("49.05");
    expect(centsToUrlValue(0)).toBe("0");
    expect(centsToUrlValue(10000)).toBe("100");
  });
});

describe("filtersToParams", () => {
  it("omits defaults", () => {
    expect(filtersToParams(parse(""))).toEqual({});
  });

  it("round-trips every filter through the URL", () => {
    const query =
      "department=women&category=dresses&size=M&color=Black&fit=slim&minPrice=20&maxPrice=149.5&q=linen&sort=price-asc&page=3";
    const params = filtersToParams(parse(query));
    expect(params).toEqual({
      department: "women",
      category: "dresses",
      size: "M",
      color: "Black",
      fit: "slim",
      minPrice: "20",
      maxPrice: "149.5",
      q: "linen",
      sort: "price-asc",
      page: "3",
    });
    expect(parse(new URLSearchParams(params as Record<string, string>).toString())).toEqual(parse(query));
  });
});

describe("buildCatalogHref", () => {
  it("adds a filter and resets pagination", () => {
    const filters = parse("category=jeans&page=4");
    expect(buildCatalogHref("/men", filters, { size: "L" })).toBe("/men?category=jeans&size=L");
  });

  it("removes a filter when the override is undefined", () => {
    const filters = parse("category=jeans&size=L");
    expect(buildCatalogHref("/shop", filters, { size: undefined })).toBe("/shop?category=jeans");
    expect(buildCatalogHref("/shop", parse("size=L"), { size: undefined })).toBe("/shop");
  });

  it("keeps the page when only the page changes", () => {
    expect(buildCatalogHref("/shop", parse("sort=newest&page=2"), { page: "3" })).toBe(
      "/shop?sort=newest&page=3",
    );
    expect(buildCatalogHref("/shop", parse("sort=newest&page=2"), { page: "1" })).toBe("/shop?sort=newest");
  });

  it("never repeats the department implied by the path", () => {
    expect(buildCatalogHref("/women", parse("department=men&category=tops"), {}, "women")).toBe(
      "/women?category=tops",
    );
  });

  it("does not emit the default sort", () => {
    expect(buildCatalogHref("/shop", parse("sort=price-desc"), { sort: "featured" })).toBe("/shop");
  });

  it("encodes values safely", () => {
    const href = buildCatalogHref("/shop", parse(""), { q: "a&b=c d" });
    expect(href).toBe("/shop?q=a%26b%3Dc+d");
  });
});
