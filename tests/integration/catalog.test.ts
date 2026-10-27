import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as listProducts } from "@/app/api/products/route";
import { GET as getProduct } from "@/app/api/products/[slug]/route";
import { GET as health } from "@/app/api/health/route";
import { closeDatabase, call, createProduct, resetDatabase } from "./helpers";

const colors = [
  { name: "Navy", hex: "#1f2a44" },
  { name: "Ecru", hex: "#e8dfcf" },
];

beforeAll(async () => {
  await resetDatabase();
  await createProduct({
    name: "Oxford Shirt",
    slug: "oxford-shirt",
    department: "men",
    category: "shirts",
    fit: "slim",
    price: 6500,
    colors,
    featured: true,
    tags: ["cotton", "office"],
    variants: [
      { size: "M", color: "Navy", stock: 4 },
      { size: "L", color: "Ecru", stock: 0 },
    ],
  });
  await createProduct({
    name: "Relaxed Chinos",
    slug: "relaxed-chinos",
    department: "men",
    category: "trousers",
    fit: "relaxed",
    price: 8900,
    colors,
    variants: [{ size: "L", color: "Navy", stock: 3 }],
  });
  await createProduct({
    name: "Wrap Dress",
    slug: "wrap-dress",
    department: "women",
    category: "dresses",
    fit: "regular",
    price: 12000,
    compareAtPrice: 15000,
    colors: [{ name: "Terracotta", hex: "#b4432a" }],
    featured: true,
    variants: [{ size: "S", color: "Terracotta", stock: 2 }],
  });
  await createProduct({
    name: "Hidden Draft Tee",
    slug: "hidden-draft-tee",
    department: "women",
    category: "tops",
    isActive: false,
    colors,
    variants: [{ size: "M", color: "Navy", stock: 9 }],
  });
  await createProduct({
    name: "100% (Cotton) Tee [Slim]",
    slug: "special-chars-tee",
    department: "men",
    category: "tshirts",
    price: 2500,
    colors,
    variants: [{ size: "S", color: "Navy", stock: 1 }],
  });
});
afterAll(closeDatabase);

const names = (json: { items: { name: string }[] }) => json.items.map((item) => item.name).sort();

describe("GET /api/products", () => {
  it("lists active products only, with plain JSON ids", async () => {
    const { status, json } = await call(listProducts, "/api/products");
    expect(status).toBe(200);
    expect(json.total).toBe(4);
    expect(json.items.map((item: { slug: string }) => item.slug)).not.toContain("hidden-draft-tee");
    expect(typeof json.items[0].id).toBe("string");
    expect(json.items[0]).not.toHaveProperty("_id");
  });

  it("filters by department and category", async () => {
    expect(names((await call(listProducts, "/api/products", { query: { department: "women" } })).json)).toEqual(["Wrap Dress"]);
    expect(names((await call(listProducts, "/api/products", { query: { department: "men", category: "trousers" } })).json)).toEqual(["Relaxed Chinos"]);
  });

  it("filters by fit and price range (prices are plain amounts)", async () => {
    expect(names((await call(listProducts, "/api/products", { query: { fit: "slim" } })).json)).toEqual(["Oxford Shirt"]);
    const mid = await call(listProducts, "/api/products", { query: { minPrice: "60", maxPrice: "90" } });
    expect(names(mid.json)).toEqual(["Oxford Shirt", "Relaxed Chinos"]);
  });

  it("only offers a size / colour that is actually in stock", async () => {
    // Oxford shirt L/Ecru has zero stock, M/Navy has four.
    expect(names((await call(listProducts, "/api/products", { query: { size: "L" } })).json)).toEqual(["Relaxed Chinos"]);
    expect(names((await call(listProducts, "/api/products", { query: { size: "M", color: "Navy" } })).json)).toEqual(["Oxford Shirt"]);
    expect(names((await call(listProducts, "/api/products", { query: { color: "Ecru" } })).json)).toEqual([]);
  });

  it("searches names and tags and treats regex characters literally", async () => {
    expect(names((await call(listProducts, "/api/products", { query: { q: "oxford" } })).json)).toEqual(["Oxford Shirt"]);
    expect(names((await call(listProducts, "/api/products", { query: { q: "OFFICE" } })).json)).toEqual(["Oxford Shirt"]);
    expect(names((await call(listProducts, "/api/products", { query: { q: "100% (Cotton)" } })).json)).toEqual(["100% (Cotton) Tee [Slim]"]);
    expect((await call(listProducts, "/api/products", { query: { q: ".*" } })).json.total).toBe(0);
    expect((await call(listProducts, "/api/products", { query: { q: "(" } })).status).toBe(200);
  });

  it("sorts and paginates deterministically", async () => {
    const asc = await call(listProducts, "/api/products", { query: { sort: "price-asc" } });
    expect(asc.json.items.map((i: { price: number }) => i.price)).toEqual([2500, 6500, 8900, 12000]);
    const desc = await call(listProducts, "/api/products", { query: { sort: "price-desc" } });
    expect(desc.json.items[0].name).toBe("Wrap Dress");

    const page1 = await call(listProducts, "/api/products", { query: { sort: "price-asc", limit: "3", page: "1" } });
    const page2 = await call(listProducts, "/api/products", { query: { sort: "price-asc", limit: "3", page: "2" } });
    expect(page1.json).toMatchObject({ total: 4, pageCount: 2, page: 1, pageSize: 3 });
    expect(page1.json.items).toHaveLength(3);
    expect(page2.json.items.map((i: { name: string }) => i.name)).toEqual(["Wrap Dress"]);

    const featured = await call(listProducts, "/api/products", { query: { featured: "true" } });
    expect(names(featured.json)).toEqual(["Oxford Shirt", "Wrap Dress"]);
  });

  it("ignores invalid filter values instead of failing", async () => {
    const { status, json } = await call(listProducts, "/api/products", {
      query: { department: "kids", category: "<script>", sort: "random", page: "-3", limit: "9999", minPrice: "abc", fit: "tight" },
    });
    expect(status).toBe(200);
    expect(json.total).toBe(4);
    expect(json.page).toBe(1);
    expect(json.pageSize).toBe(12);
  });
});

describe("GET /api/products/[slug]", () => {
  it("returns a product with its variants", async () => {
    const { status, json } = await call(getProduct, "/api/products/oxford-shirt", { params: { slug: "oxford-shirt" } });
    expect(status).toBe(200);
    expect(json.product).toMatchObject({ name: "Oxford Shirt", price: 6500, inStock: true, fit: "slim" });
    expect(json.product.variants).toHaveLength(2);
  });

  it("returns 404 for unknown and inactive products", async () => {
    expect((await call(getProduct, "/api/products/nope", { params: { slug: "nope" } })).status).toBe(404);
    expect((await call(getProduct, "/api/products/hidden-draft-tee", { params: { slug: "hidden-draft-tee" } })).status).toBe(404);
  });
});

describe("GET /api/health", () => {
  it("reports that the database is reachable", async () => {
    const { status, json } = await call(health, "/api/health");
    expect(status).toBe(200);
    expect(json).toEqual({ status: "ok", database: "up" });
  });
});
