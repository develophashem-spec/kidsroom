"use client";

import {
  addLine,
  cartCount,
  parseStoredCart,
  removeLine,
  setLineQuantity,
  type CartLine,
} from "@/lib/cart-utils";
import { createLocalStore } from "@/lib/local-store";

const EMPTY: CartLine[] = [];

const store = createLocalStore<CartLine[]>({
  key: "tf-cart-v1",
  empty: EMPTY,
  parse: parseStoredCart,
  serialize: (lines) => (lines.length === 0 ? null : JSON.stringify(lines)),
});

/** The shopping bag lives in the browser; prices are always recomputed on the server. */
export const cart = {
  add: (line: CartLine) => store.set(addLine(store.get(), line)),
  setQuantity: (key: string, quantity: number) =>
    store.set(setLineQuantity(store.get(), key, quantity)),
  remove: (key: string) => store.set(removeLine(store.get(), key)),
  clear: () => store.set(EMPTY),
};

export const useCart = store.useValue;

export function useCartCount(): number {
  return cartCount(store.useValue());
}
