import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as register } from "@/app/api/auth/register/route";
import { GET as listAdminOrders } from "@/app/api/admin/orders/route";
import { GET as getAdminOrder, PATCH as patchAdminOrder } from "@/app/api/admin/orders/[id]/route";
import { GET as listAdminProducts, POST as createAdminProduct } from "@/app/api/admin/products/route";
import {
  DELETE as deleteAdminProduct,
  GET as getAdminProduct,
  PUT as updateAdminProduct,
} from "@/app/api/admin/products/[id]/route";
import { GET as getPublicProduct } from "@/app/api/products/[slug]/route";
import { POST as placeOrder } from "@/app/api/orders/route";
import { clearAllRateLimits } from "@/lib/rate-limit";
import { Order, Product } from "@/models";
import {
  call,
  closeDatabase,
  createAdmin,
  createProduct,
  registerCustomer,
  resetDatabase,
  stockOf,
} from "./helpers";

const validProduct = {
  name: "Linen Camp Shirt",
  description: "Breathable linen.",
  details: ["100% linen", "Machine washable"],
  department: "men",
  category: "shirts",
  fit: "relaxed",
  price: 7400,
  compareAtPrice: 9000,
  colors: [
    { name: "Sand", hex: "#d8c7a5" },
    { name: "Olive", hex: "#5b6446" },
  ],
  images: [],
  variants: [
    { size: "M", color: "Sand", stock: 6 },
    { size: "L", color: "Olive", stock: 2 },
  ],
  tags: ["linen", "summer"],
  featured: true,
  isActive: true,
};

let admin: { cookie: string };
let customer: { cookie: string };

beforeAll(resetDatabase);
afterAll(closeDatabase);
beforeEach(async () => {
  clearAllRateLimits();
  await Promise.all([Product.deleteMany({}), Order.deleteMany({})]);
  admin = await createAdmin(login);
  customer = await registerCustomer(register);
});

describe("admin authorisation", () => {
  const cases: [string, () => Promise<{ status: number }>][] = [
    ["list products", () => call(listAdminProducts, "/api/admin/products", { cookie: null })],
    ["create product", () => call(createAdminProduct, "/api/admin/products", { body: validProduct })],
    ["list orders", () => call(listAdminOrders, "/api/admin/orders")],
  ];

  it.each(cases)("%s requires sign-in", async (_name, run) => {
    expect((await run()).status).toBe(401);
  });

  it("forbids customers from every admin endpoint", async () => {
    const product = await createProduct();
    const id = String(product._id);
    const cookie = customer.cookie;
    const statuses = await Promise.all([
      call(listAdminProducts, "/api/admin/products", { cookie }),
      call(createAdminProduct, "/api/admin/products", { cookie, body: validProduct }),
      call(getAdminProduct, `/api/admin/products/${id}`, { cookie, params: { id } }),
      call(updateAdminProduct, `/api/admin/products/${id}`, { cookie, method: "PUT", body: validProduct, params: { id } }),
      call(deleteAdminProduct, `/api/admin/products/${id}`, { cookie, method: "DELETE", params: { id } }),
      call(listAdminOrders, "/api/admin/orders", { cookie }),
      call(getAdminOrder, `/api/admin/orders/${id}`, { cookie, params: { id } }),
      call(patchAdminOrder, `/api/admin/orders/${id}`, { cookie, method: "PATCH", body: { status: "confirmed" }, params: { id } }),
    ]);
    expect(statuses.map((s) => s.status)).toEqual(Array(8).fill(403));
    expect(await Product.countDocuments({})).toBe(1);
  });
});

describe("admin products", () => {
  it("creates a product with a generated slug and makes it public", async () => {
    const created = await call(createAdminProduct, "/api/admin/products", { cookie: admin.cookie, body: validProduct });
    expect(created.status).toBe(201);
    expect(created.json.product).toMatchObject({ slug: "linen-camp-shirt", price: 7400, compareAtPrice: 9000, inStock: true });

    const pub = await call(getPublicProduct, "/api/products/linen-camp-shirt", { params: { slug: "linen-camp-shirt" } });
    expect(pub.status).toBe(200);
  });

  it("keeps slugs unique by suffixing generated ones and rejecting explicit duplicates", async () => {
    const first = await call(createAdminProduct, "/api/admin/products", { cookie: admin.cookie, body: validProduct });
    const second = await call(createAdminProduct, "/api/admin/products", { cookie: admin.cookie, body: validProduct });
    expect(first.json.product.slug).toBe("linen-camp-shirt");
    expect(second.status).toBe(201);
    expect(second.json.product.slug).toBe("linen-camp-shirt-2");

    const dupe = await call(createAdminProduct, "/api/admin/products", { cookie: admin.cookie, body: { ...validProduct, slug: "linen-camp-shirt" } });
    expect(dupe.status).toBe(409);
  });

  it("validates product input", async () => {
    const post = (body: unknown) => call(createAdminProduct, "/api/admin/products", { cookie: admin.cookie, body });
    const issuesOf = (r: { json: { error: { details?: { issues: { path: string }[] } } } }) =>
      r.json.error.details?.issues.map((i) => i.path) ?? [];

    expect(issuesOf(await post({ ...validProduct, price: 12.5 }))).toContain("price");
    expect(issuesOf(await post({ ...validProduct, price: 0 }))).toContain("price");
    expect(issuesOf(await post({ ...validProduct, compareAtPrice: 100 }))).toContain("compareAtPrice");
    expect(issuesOf(await post({ ...validProduct, category: "dresses" }))).toContain("category");
    expect(issuesOf(await post({ ...validProduct, variants: [{ size: "XXXL", color: "Sand", stock: 1 }] }))).toContain("variants.0.size");
    expect(issuesOf(await post({ ...validProduct, variants: [{ size: "M", color: "Pink", stock: 1 }] }))).toContain("variants.0.color");
    expect(issuesOf(await post({ ...validProduct, variants: [{ size: "M", color: "Sand", stock: -1 }] }))).toContain("variants.0.stock");
    expect(issuesOf(await post({ ...validProduct, colors: [{ name: "X", hex: "red" }] }))).toContain("colors.0.hex");
    expect(issuesOf(await post({ ...validProduct, images: ["javascript:alert(1)"] }))).toContain("images.0");
    expect(issuesOf(await post({ ...validProduct, images: ["//evil.example/x.png"] }))).toContain("images.0");
    expect(issuesOf(await post({ ...validProduct, variants: [{ size: "M", color: "Sand", stock: 1 }, { size: "M", color: "Sand", stock: 2 }] }))).toContain("variants.1");
    expect(issuesOf(await post({ ...validProduct, slug: "Bad Slug!" }))).toContain("slug");
    expect(await Product.countDocuments({})).toBe(0);

    const ok = await post({ ...validProduct, images: ["https://cdn.example.com/a.jpg", "/images/b.jpg"], category: "shirts" });
    expect(ok.status).toBe(201);
  });

  it("updates, lists, fetches and deletes a product", async () => {
    const created = await call(createAdminProduct, "/api/admin/products", { cookie: admin.cookie, body: validProduct });
    const id = created.json.product.id as string;

    const updated = await call(updateAdminProduct, `/api/admin/products/${id}`, {
      cookie: admin.cookie,
      method: "PUT",
      params: { id },
      body: { ...validProduct, name: "Linen Camp Shirt v2", price: 6900, isActive: false, variants: [{ size: "M", color: "Sand", stock: 9 }] },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.product).toMatchObject({ name: "Linen Camp Shirt v2", price: 6900, isActive: false, slug: "linen-camp-shirt" });

    // inactive products disappear from the storefront but stay visible to admins
    expect((await call(getPublicProduct, "/api/products/linen-camp-shirt", { params: { slug: "linen-camp-shirt" } })).status).toBe(404);
    expect((await call(getAdminProduct, `/api/admin/products/${id}`, { cookie: admin.cookie, params: { id } })).status).toBe(200);

    const list = await call(listAdminProducts, "/api/admin/products", { cookie: admin.cookie, query: { q: "camp" } });
    expect(list.json.total).toBe(1);

    expect((await call(deleteAdminProduct, `/api/admin/products/${id}`, { cookie: admin.cookie, method: "DELETE", params: { id } })).status).toBe(200);
    expect((await call(getAdminProduct, `/api/admin/products/${id}`, { cookie: admin.cookie, params: { id } })).status).toBe(404);
    expect((await call(deleteAdminProduct, `/api/admin/products/${id}`, { cookie: admin.cookie, method: "DELETE", params: { id } })).status).toBe(404);
    expect((await call(updateAdminProduct, "/api/admin/products/zzz", { cookie: admin.cookie, method: "PUT", params: { id: "zzz" }, body: validProduct })).status).toBe(404);
  });
});

describe("admin orders", () => {
  async function orderWithStock() {
    const product = await createProduct({ price: 4000, variants: [{ size: "M", color: "Navy", stock: 4 }] });
    const placed = await call(placeOrder, "/api/orders", {
      cookie: customer.cookie,
      body: {
        lines: [{ productId: String(product._id), size: "M", color: "Navy", quantity: 3 }],
        shippingAddress: { fullName: "Grace Hopper", phone: "555 0100", line1: "1 Compiler Rd", city: "Arlington", postalCode: "22201", country: "USA" },
      },
    });
    expect(placed.status).toBe(201);
    return { product, order: placed.json.order as { id: string } };
  }

  const patch = (id: string, status: string, cookie = admin.cookie) =>
    call(patchAdminOrder, `/api/admin/orders/${id}`, { cookie, method: "PATCH", params: { id }, body: { status } });

  it("lists orders with the customer and filters by status", async () => {
    const { order } = await orderWithStock();
    const all = await call(listAdminOrders, "/api/admin/orders", { cookie: admin.cookie });
    expect(all.json.total).toBe(1);
    expect(all.json.items[0].customer).toMatchObject({ name: expect.any(String), email: expect.stringContaining("@") });

    expect((await call(listAdminOrders, "/api/admin/orders", { cookie: admin.cookie, query: { status: "shipped" } })).json.total).toBe(0);
    expect((await call(listAdminOrders, "/api/admin/orders", { cookie: admin.cookie, query: { status: "pending" } })).json.total).toBe(1);
    expect((await call(getAdminOrder, `/api/admin/orders/${order.id}`, { cookie: admin.cookie, params: { id: order.id } })).json.order.customer).toBeTruthy();
  });

  it("walks an order through its lifecycle and rejects illegal jumps", async () => {
    const { order } = await orderWithStock();

    expect((await patch(order.id, "shipped")).status).toBe(409); // pending → shipped is not allowed
    expect((await patch(order.id, "delivered")).status).toBe(409);
    expect((await patch(order.id, "bogus")).status).toBe(400);

    const confirmed = await patch(order.id, "confirmed");
    expect(confirmed.json.order.status).toBe("confirmed");
    expect((await patch(order.id, "shipped")).json.order.status).toBe("shipped");
    const delivered = await patch(order.id, "delivered");
    expect(delivered.json.order.status).toBe("delivered");
    expect(delivered.json.order.statusHistory.map((s: { status: string }) => s.status)).toEqual(["pending", "confirmed", "shipped", "delivered"]);

    expect((await patch(order.id, "cancelled")).status).toBe(409); // delivered orders are final
    expect((await patch("a".repeat(24), "confirmed")).status).toBe(404);
  });

  it("restocks when an admin cancels, but never twice", async () => {
    const { product, order } = await orderWithStock();
    expect(await stockOf(String(product._id), "M", "Navy")).toBe(1);

    await patch(order.id, "confirmed");
    const cancelled = await patch(order.id, "cancelled");
    expect(cancelled.status).toBe(200);
    expect(await stockOf(String(product._id), "M", "Navy")).toBe(4);

    expect((await patch(order.id, "cancelled")).status).toBe(409);
    expect(await stockOf(String(product._id), "M", "Navy")).toBe(4);
  });
});
