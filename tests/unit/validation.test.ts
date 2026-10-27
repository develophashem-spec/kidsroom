import { describe, expect, it } from "vitest";
import {
  complementaryCategories,
  DEPARTMENT_CATEGORIES,
  ORDER_STATUS_TRANSITIONS,
  sizesFor,
} from "@/lib/catalog-constants";
import {
  createOrderSchema,
  escapeRegex,
  loginSchema,
  parsePage,
  parseProductFilters,
  productInputSchema,
  registerSchema,
  toValidationIssues,
} from "@/lib/validation";

describe("parseProductFilters", () => {
  it("applies defaults", () => {
    expect(parseProductFilters({})).toMatchObject({ sort: "featured", page: 1, limit: 12, featured: false });
  });

  it("parses valid values, converting prices to cents", () => {
    const filters = parseProductFilters({
      department: "women",
      category: "dresses",
      size: " S ",
      color: "Terracotta",
      fit: "relaxed",
      minPrice: "20",
      maxPrice: "99.50",
      q: "  wrap ",
      sort: "price-desc",
      page: "3",
      limit: "24",
      featured: "true",
    });
    expect(filters).toEqual({
      department: "women",
      category: "dresses",
      size: "S",
      color: "Terracotta",
      fit: "relaxed",
      minPrice: 2000,
      maxPrice: 9950,
      q: "wrap",
      sort: "price-desc",
      page: 3,
      limit: 24,
      featured: true,
    });
  });

  it("takes the first value of repeated params and accepts URLSearchParams", () => {
    expect(parseProductFilters({ department: ["men", "women"] }).department).toBe("men");
    expect(parseProductFilters(new URLSearchParams("category=jeans&page=2")).category).toBe("jeans");
  });

  it("silently drops invalid values", () => {
    const filters = parseProductFilters({
      department: "kids",
      category: "nope",
      fit: "tight",
      minPrice: "-5",
      maxPrice: "1e9",
      q: "x".repeat(200),
      sort: "random",
      page: "0",
      limit: "1000",
    });
    expect(filters).toMatchObject({ sort: "featured", page: 1, limit: 12 });
    for (const key of ["department", "category", "fit", "minPrice", "maxPrice", "q"] as const) {
      expect(filters[key]).toBeUndefined();
    }
  });
});

describe("parsePage", () => {
  it.each([
    ["3", 3],
    [null, 1],
    [undefined, 1],
    ["", 1],
    ["0", 1],
    ["-2", 1],
    ["abc", 1],
    ["1.5", 1],
    ["99999", 1],
  ])("parses %j as %i", (input, expected) => {
    expect(parsePage(input)).toBe(expected);
  });
});

describe("auth schemas", () => {
  it("normalises email and trims the name", () => {
    const parsed = registerSchema.parse({ name: "  Ada ", email: "  ADA@Example.COM ", password: "longenough" });
    expect(parsed).toEqual({ name: "Ada", email: "ada@example.com", password: "longenough" });
  });

  it("measures the password limit in bytes", () => {
    const base = { name: "A", email: "a@example.com" };
    expect(registerSchema.safeParse({ ...base, password: "é".repeat(36) }).success).toBe(true); // 72 bytes
    expect(registerSchema.safeParse({ ...base, password: "é".repeat(37) }).success).toBe(false); // 74 bytes
    expect(loginSchema.safeParse({ email: "a@example.com", password: "" }).success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  const valid = {
    lines: [{ productId: "a".repeat(24), size: "M", color: "Navy", quantity: 2 }],
    shippingAddress: {
      fullName: "Ada Lovelace",
      phone: "+44 20 7946 0000",
      line1: "12 Analytical Way",
      city: "London",
      postalCode: "N1 9GU",
      country: "UK",
    },
  };

  it("fills in defaults and strips unknown keys (e.g. client supplied prices)", () => {
    const parsed = createOrderSchema.parse({ ...valid, total: 1, lines: [{ ...valid.lines[0], price: 1 }] });
    expect(parsed.paymentMethod).toBe("cod");
    expect(parsed.notes).toBe("");
    expect(parsed.shippingAddress.line2).toBe("");
    expect(parsed).not.toHaveProperty("total");
    expect(parsed.lines[0]).not.toHaveProperty("price");
  });

  it("reports readable, path-addressed issues", () => {
    const result = createOrderSchema.safeParse({ ...valid, shippingAddress: { ...valid.shippingAddress, phone: "x" } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toValidationIssues(result.error)).toEqual([
        { path: "shippingAddress.phone", message: "Enter a valid phone number" },
      ]);
    }
  });
});

describe("productInputSchema", () => {
  const valid = {
    name: "Wool Coat",
    department: "women",
    category: "jackets",
    price: 19900,
    colors: [{ name: "Camel", hex: "#c19a6b" }],
    variants: [{ size: "M", color: "Camel", stock: 3 }],
  };

  it("accepts a minimal product and fills defaults", () => {
    const parsed = productInputSchema.parse(valid);
    expect(parsed).toMatchObject({ fit: "regular", featured: false, isActive: true, compareAtPrice: null, images: [], tags: [] });
  });

  it("restricts shoe sizes to the department's shoe sizes", () => {
    const shoe = { ...valid, category: "shoes", variants: [{ size: "M", color: "Camel", stock: 1 }] };
    expect(productInputSchema.safeParse(shoe).success).toBe(false);
    expect(productInputSchema.safeParse({ ...shoe, variants: [{ size: "38", color: "Camel", stock: 1 }] }).success).toBe(true);
    expect(productInputSchema.safeParse({ ...shoe, variants: [{ size: "44", color: "Camel", stock: 1 }] }).success).toBe(false);
  });
});

describe("catalogue constants", () => {
  it("only offers sensible sizes per category", () => {
    expect(sizesFor("men", "shoes")).toContain("43");
    expect(sizesFor("women", "shoes")).toContain("37");
    expect(sizesFor("men", "accessories")).toEqual(["One size"]);
    expect(sizesFor("women", "dresses")).toEqual(["XS", "S", "M", "L", "XL", "XXL"]);
  });

  it("suggests complementary categories that the department actually sells", () => {
    for (const department of ["men", "women"] as const) {
      for (const category of DEPARTMENT_CATEGORIES[department]) {
        const suggestions = complementaryCategories(category);
        expect(suggestions).not.toContain(category);
        expect(suggestions.some((s) => DEPARTMENT_CATEGORIES[department].includes(s))).toBe(true);
      }
    }
  });

  it("has terminal delivered / cancelled statuses", () => {
    expect(ORDER_STATUS_TRANSITIONS.delivered).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS.cancelled).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS.pending).toContain("cancelled");
  });
});

describe("escapeRegex", () => {
  it("escapes every regex metacharacter", () => {
    const text = ".*+?^${}()|[]\\";
    expect(new RegExp(escapeRegex(text)).test(text)).toBe(true);
    expect(new RegExp(`^${escapeRegex("a.b")}$`).test("axb")).toBe(false);
  });
});
