import { describe, expect, it } from "vitest";
import { cartLimits } from "@/config/site";
import {
  addLine,
  cartCount,
  lineKey,
  mergeLines,
  parseStoredCart,
  removeLine,
  setLineQuantity,
  type CartLine,
} from "@/lib/cart-utils";

const id = (n: number) => n.toString(16).padStart(24, "0");
const line = (n: number, size = "M", color = "Navy", quantity = 1): CartLine => ({
  productId: id(n),
  size,
  color,
  quantity,
});

describe("mergeLines", () => {
  it("sums quantities of identical lines and keeps first-seen order", () => {
    const merged = mergeLines([line(1, "M", "Navy", 1), line(2), line(1, "M", "Navy", 2), line(1, "L")]);
    expect(merged.map((l) => [l.productId, l.size, l.quantity])).toEqual([
      [id(1), "M", 3],
      [id(2), "M", 1],
      [id(1), "L", 1],
    ]);
  });

  it("does not mutate its input", () => {
    const input = [line(1), line(1)];
    mergeLines(input);
    expect(input.map((l) => l.quantity)).toEqual([1, 1]);
  });
});

describe("addLine / setLineQuantity / removeLine", () => {
  it("adds new lines and increments existing ones, capped per line", () => {
    let lines = addLine([], line(1));
    lines = addLine(lines, line(1, "M", "Navy", 4));
    expect(lines).toEqual([line(1, "M", "Navy", 5)]);
    lines = addLine(lines, line(1, "M", "Navy", 100));
    expect(lines[0].quantity).toBe(cartLimits.maxQuantityPerLine);
  });

  it("stops adding new lines at the cart limit", () => {
    let lines: CartLine[] = [];
    for (let i = 1; i <= cartLimits.maxLines + 5; i += 1) lines = addLine(lines, line(i));
    expect(lines).toHaveLength(cartLimits.maxLines);
  });

  it("sets and clamps quantities, removing the line below one", () => {
    const start = [line(1), line(2)];
    const key = lineKey(line(1));
    expect(setLineQuantity(start, key, 4)[0].quantity).toBe(4);
    expect(setLineQuantity(start, key, 99)[0].quantity).toBe(cartLimits.maxQuantityPerLine);
    expect(setLineQuantity(start, key, 0).map((l) => l.productId)).toEqual([id(2)]);
    expect(setLineQuantity(start, key, Number.NaN).map((l) => l.productId)).toEqual([id(2)]);
    expect(start[0].quantity).toBe(1);
  });

  it("removes by key", () => {
    expect(removeLine([line(1), line(2)], lineKey(line(2)))).toEqual([line(1)]);
    expect(removeLine([line(1)], "missing")).toEqual([line(1)]);
  });

  it("counts items", () => {
    expect(cartCount([line(1, "M", "Navy", 2), line(2, "L", "Navy", 3)])).toBe(5);
    expect(cartCount([])).toBe(0);
  });
});

describe("parseStoredCart", () => {
  it("round-trips a valid cart", () => {
    const cart = [line(1, "M", "Navy", 2), line(2, "42", "Black", 1)];
    expect(parseStoredCart(JSON.stringify(cart))).toEqual(cart);
  });

  it.each([null, "", "not json", "{}", "42", '"x"', "null"])("treats %j as an empty cart", (raw) => {
    expect(parseStoredCart(raw)).toEqual([]);
  });

  it("drops malformed entries and clamps quantities", () => {
    const raw = JSON.stringify([
      line(1, "M", "Navy", 500),
      { productId: "nope", size: "M", color: "Navy", quantity: 1 },
      { productId: id(2), size: "", color: "Navy", quantity: 1 },
      { productId: id(3), size: "M", color: "Navy", quantity: 0 },
      { productId: id(4), size: "M", color: "Navy", quantity: "2" },
      { productId: id(5), size: "x".repeat(50), color: "Navy", quantity: 1 },
      null,
      7,
      line(6),
    ]);
    expect(parseStoredCart(raw)).toEqual([
      line(1, "M", "Navy", cartLimits.maxQuantityPerLine),
      line(6),
    ]);
  });

  it("merges duplicate lines and respects the line cap", () => {
    const duplicates = parseStoredCart(JSON.stringify([line(1), line(1, "M", "Navy", 2)]));
    expect(duplicates).toEqual([line(1, "M", "Navy", 3)]);

    const many = Array.from({ length: cartLimits.maxLines + 10 }, (_, i) => line(i + 1));
    expect(parseStoredCart(JSON.stringify(many))).toHaveLength(cartLimits.maxLines);
  });
});
