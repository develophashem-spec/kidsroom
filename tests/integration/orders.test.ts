import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as quote } from "@/app/api/cart/quote/route";
import { GET as listOrders, POST as placeOrder } from "@/app/api/orders/route";
import { GET as getOrder } from "@/app/api/orders/[id]/route";
import { POST as cancelOrder } from "@/app/api/orders/[id]/cancel/route";
import { shippingConfig } from "@/config/site";
import { clearAllRateLimits } from "@/lib/rate-limit";
import { Order } from "@/models";
import {
  call,
  closeDatabase,
  createProduct,
  registerCustomer,
  resetDatabase,
  stockOf,
} from "./helpers";

const address = {
  fullName: "Ada Lovelace",
  phone: "+1 555 010 2030",
  line1: "12 Analytical Way",
  city: "London",
  postalCode: "N1 9GU",
  country: "United Kingdom",
};

let shirt: Awaited<ReturnType<typeof createProduct>>;
let tee: Awaited<ReturnType<typeof createProduct>>;

const line = (product: { _id: unknown }, size: string, quantity: number, color = "Navy") => ({
  productId: String(product._id),
  size,
  color,
  quantity,
});

beforeAll(resetDatabase);
afterAll(closeDatabase);

beforeEach(async () => {
  clearAllRateLimits();
  await Order.deleteMany({});
  shirt = await createProduct({ price: 5000, variants: [{ size: "M", color: "Navy", stock: 5 }, { size: "L", color: "Navy", stock: 1 }] });
  tee = await createProduct({ category: "tshirts", price: 2000, variants: [{ size: "M", color: "Navy", stock: 3 }] });
});

describe("POST /api/cart/quote", () => {
  it("prices lines from the database and merges duplicates", async () => {
    const { status, json } = await call(quote, "/api/cart/quote", {
      body: { lines: [line(shirt, "M", 1), line(shirt, "M", 2), line(tee, "M", 1)] },
    });
    expect(status).toBe(200);
    const q = json.quote;
    expect(q.lines).toHaveLength(2);
    expect(q.lines[0]).toMatchObject({ quantity: 3, unitPrice: 5000, lineTotal: 15000, status: "ok" });
    expect(q.subtotal).toBe(17000);
    expect(q.shipping).toBe(0); // above the free-shipping threshold
    expect(q.total).toBe(17000);
    expect(q.hasIssues).toBe(false);
  });

  it("adds flat shipping below the free-shipping threshold", async () => {
    const { json } = await call(quote, "/api/cart/quote", { body: { lines: [line(tee, "M", 1)] } });
    expect(json.quote.subtotal).toBe(2000);
    expect(json.quote.shipping).toBe(shippingConfig.flatRate);
    expect(json.quote.total).toBe(2000 + shippingConfig.flatRate);
  });

  it("flags unavailable, out of stock and over-quantity lines and excludes them from totals", async () => {
    const soldOut = await createProduct({ variants: [{ size: "M", color: "Navy", stock: 0 }] });
    const inactive = await createProduct({ isActive: false });
    const { json } = await call(quote, "/api/cart/quote", {
      body: {
        lines: [
          line(shirt, "L", 2), // only 1 left
          line(soldOut, "M", 1),
          line(inactive, "M", 1),
          line(shirt, "XXL", 1), // variant does not exist
          line({ _id: "a".repeat(24) }, "M", 1), // product does not exist
          line(tee, "M", 1),
        ],
      },
    });
    const statuses = json.quote.lines.map((l: { status: string }) => l.status);
    expect(statuses).toEqual(["insufficient", "out_of_stock", "unavailable", "unavailable", "unavailable", "ok"]);
    expect(json.quote.lines[0].available).toBe(1);
    expect(json.quote.subtotal).toBe(2000);
    expect(json.quote.hasIssues).toBe(true);
  });

  it("returns an empty quote for an empty cart and validates input", async () => {
    expect((await call(quote, "/api/cart/quote", { body: { lines: [] } })).json.quote).toMatchObject({ subtotal: 0, total: 0, lines: [] });
    expect((await call(quote, "/api/cart/quote", { body: { lines: [{ productId: "nope", size: "M", color: "Navy", quantity: 1 }] } })).status).toBe(400);
    expect((await call(quote, "/api/cart/quote", { body: { lines: [line(shirt, "M", 0)] } })).status).toBe(400);
    expect((await call(quote, "/api/cart/quote", { body: { lines: [line(shirt, "M", 11)] } })).status).toBe(400);
    expect((await call(quote, "/api/cart/quote", { body: { lines: [line(shirt, "M", 1.5)] } })).status).toBe(400);
    expect((await call(quote, "/api/cart/quote", { body: {} })).status).toBe(400);
  });
});

describe("POST /api/orders", () => {
  it("requires a signed-in customer", async () => {
    const result = await call(placeOrder, "/api/orders", {
      body: { lines: [line(tee, "M", 1)], shippingAddress: address },
    });
    expect(result.status).toBe(401);
    expect(await stockOf(String(tee._id), "M", "Navy")).toBe(3);
  });

  it("creates the order, snapshots prices and reserves stock", async () => {
    const { cookie, user } = await registerCustomer(register);
    const result = await call(placeOrder, "/api/orders", {
      cookie,
      body: { lines: [line(shirt, "M", 2), line(tee, "M", 1)], shippingAddress: address, notes: "Leave at the door" },
    });

    expect(result.status).toBe(201);
    const order = result.json.order;
    expect(order.orderNumber).toMatch(/^TF-[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(order).toMatchObject({ status: "pending", paymentMethod: "cod", subtotal: 12000, shipping: 0, total: 12000, notes: "Leave at the door" });
    expect(order.items).toHaveLength(2);
    expect(order.items[0]).toMatchObject({ name: shirt.name, unitPrice: 5000, quantity: 2, lineTotal: 10000 });
    expect(order.statusHistory).toHaveLength(1);

    expect(await stockOf(String(shirt._id), "M", "Navy")).toBe(3);
    expect(await stockOf(String(tee._id), "M", "Navy")).toBe(2);

    const stored = await Order.findById(order.id).lean();
    expect(String(stored?.user)).toBe(user.id);
  });

  it("ignores client supplied prices, totals and status", async () => {
    const { cookie } = await registerCustomer(register);
    const result = await call(placeOrder, "/api/orders", {
      cookie,
      body: {
        lines: [{ ...line(shirt, "M", 1), price: 1, unitPrice: 1 }],
        shippingAddress: address,
        total: 1,
        subtotal: 1,
        status: "delivered",
      },
    });
    expect(result.status).toBe(201);
    expect(result.json.order).toMatchObject({ subtotal: 5000, status: "pending", total: 5000 + shippingConfig.flatRate });
  });

  it("refuses to oversell: stock is untouched when a line is short", async () => {
    const { cookie } = await registerCustomer(register);
    const result = await call(placeOrder, "/api/orders", {
      cookie,
      body: { lines: [line(shirt, "M", 1), line(shirt, "L", 2)], shippingAddress: address },
    });
    expect(result.status).toBe(409);
    expect(await stockOf(String(shirt._id), "M", "Navy")).toBe(5);
    expect(await stockOf(String(shirt._id), "L", "Navy")).toBe(1);
    expect(await Order.countDocuments({})).toBe(0);
  });

  it("lets exactly one of several concurrent shoppers buy the last item", async () => {
    const shoppers = await Promise.all(Array.from({ length: 4 }, () => registerCustomer(register)));
    const results = await Promise.all(
      shoppers.map(({ cookie }) =>
        call(placeOrder, "/api/orders", { cookie, body: { lines: [line(shirt, "L", 1)], shippingAddress: address } }),
      ),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409]);
    expect(await stockOf(String(shirt._id), "L", "Navy")).toBe(0);
    expect(await Order.countDocuments({})).toBe(1);
  });

  it("rolls back earlier reservations when a later line cannot be reserved", async () => {
    const { cookie } = await registerCustomer(register);
    // Two shoppers race for the last L: the loser's earlier M reservation must be released.
    const other = await registerCustomer(register);
    const [a, b] = await Promise.all([
      call(placeOrder, "/api/orders", { cookie, body: { lines: [line(shirt, "M", 2), line(shirt, "L", 1)], shippingAddress: address } }),
      call(placeOrder, "/api/orders", { cookie: other.cookie, body: { lines: [line(tee, "M", 1), line(shirt, "L", 1)], shippingAddress: address } }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const winnerBoughtM = a.status === 201 ? 2 : 0;
    const winnerBoughtTee = b.status === 201 ? 1 : 0;
    expect(await stockOf(String(shirt._id), "M", "Navy")).toBe(5 - winnerBoughtM);
    expect(await stockOf(String(tee._id), "M", "Navy")).toBe(3 - winnerBoughtTee);
    expect(await stockOf(String(shirt._id), "L", "Navy")).toBe(0);
  });

  it("validates the shipping address and the cart", async () => {
    const { cookie } = await registerCustomer(register);
    const bad = await call(placeOrder, "/api/orders", {
      cookie,
      body: { lines: [line(tee, "M", 1)], shippingAddress: { ...address, phone: "abc", fullName: "" } },
    });
    expect(bad.status).toBe(400);
    expect((await call(placeOrder, "/api/orders", { cookie, body: { lines: [], shippingAddress: address } })).status).toBe(400);
    expect((await call(placeOrder, "/api/orders", { cookie, body: { lines: [line(tee, "M", 1)], shippingAddress: address, paymentMethod: "card" } })).status).toBe(400);
    expect(await stockOf(String(tee._id), "M", "Navy")).toBe(3);
  });
});

describe("reading and cancelling orders", () => {
  async function placeFor(cookie: string, lines = [line(tee, "M", 2)]) {
    const result = await call(placeOrder, "/api/orders", { cookie, body: { lines, shippingAddress: address } });
    expect(result.status).toBe(201);
    return result.json.order as { id: string };
  }

  it("lets customers see only their own orders", async () => {
    const alice = await registerCustomer(register);
    const bob = await registerCustomer(register);
    const order = await placeFor(alice.cookie);

    const mine = await call(listOrders, "/api/orders", { cookie: alice.cookie });
    expect(mine.json.items.map((o: { id: string }) => o.id)).toEqual([order.id]);
    expect((await call(listOrders, "/api/orders", { cookie: bob.cookie })).json.items).toEqual([]);

    expect((await call(getOrder, `/api/orders/${order.id}`, { cookie: alice.cookie, params: { id: order.id } })).status).toBe(200);
    expect((await call(getOrder, `/api/orders/${order.id}`, { cookie: bob.cookie, params: { id: order.id } })).status).toBe(404);
    expect((await call(getOrder, `/api/orders/${order.id}`, { params: { id: order.id } })).status).toBe(401);
    expect((await call(getOrder, "/api/orders/not-an-id", { cookie: alice.cookie, params: { id: "not-an-id" } })).status).toBe(404);
  });

  it("cancels a pending order and puts the stock back exactly once", async () => {
    const { cookie } = await registerCustomer(register);
    const order = await placeFor(cookie);
    expect(await stockOf(String(tee._id), "M", "Navy")).toBe(1);

    const cancelled = await call(cancelOrder, `/api/orders/${order.id}/cancel`, { method: "POST", cookie, params: { id: order.id } });
    expect(cancelled.status).toBe(200);
    expect(cancelled.json.order.status).toBe("cancelled");
    expect(cancelled.json.order.statusHistory.map((s: { status: string }) => s.status)).toEqual(["pending", "cancelled"]);
    expect(await stockOf(String(tee._id), "M", "Navy")).toBe(3);

    const again = await call(cancelOrder, `/api/orders/${order.id}/cancel`, { method: "POST", cookie, params: { id: order.id } });
    expect(again.status).toBe(409);
    expect(await stockOf(String(tee._id), "M", "Navy")).toBe(3);
  });

  it("restocks only once even when cancellations race", async () => {
    const { cookie } = await registerCustomer(register);
    const order = await placeFor(cookie);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        call(cancelOrder, `/api/orders/${order.id}/cancel`, { method: "POST", cookie, params: { id: order.id } }),
      ),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await stockOf(String(tee._id), "M", "Navy")).toBe(3);
  });

  it("does not let one customer cancel another's order", async () => {
    const alice = await registerCustomer(register);
    const bob = await registerCustomer(register);
    const order = await placeFor(alice.cookie);
    const result = await call(cancelOrder, `/api/orders/${order.id}/cancel`, { method: "POST", cookie: bob.cookie, params: { id: order.id } });
    expect(result.status).toBe(404);
    expect(await stockOf(String(tee._id), "M", "Navy")).toBe(1);
  });

  it("does not let customers cancel an order that is already confirmed", async () => {
    const { cookie } = await registerCustomer(register);
    const order = await placeFor(cookie);
    await Order.updateOne({ _id: order.id }, { $set: { status: "confirmed" } });
    const result = await call(cancelOrder, `/api/orders/${order.id}/cancel`, { method: "POST", cookie, params: { id: order.id } });
    expect(result.status).toBe(409);
    expect(await stockOf(String(tee._id), "M", "Navy")).toBe(1);
  });
});
