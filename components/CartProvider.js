"use client";
import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export default function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem("cart") || "[]"));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem("cart", JSON.stringify(items));
  }, [items, ready]);

  const same = (a, id, size) => a.id === id && a.size === size;
  const add = (item) =>
    setItems((cur) =>
      cur.some((i) => same(i, item.id, item.size))
        ? cur.map((i) => (same(i, item.id, item.size) ? { ...i, quantity: i.quantity + 1 } : i))
        : [...cur, { ...item, quantity: 1 }]
    );
  const remove = (id, size) => setItems((cur) => cur.filter((i) => !same(i, id, size)));
  const setQty = (id, size, q) =>
    setItems((cur) => cur.map((i) => (same(i, id, size) ? { ...i, quantity: Math.max(1, q) } : i)));
  const clear = () => setItems([]);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const total = items.reduce((n, i) => n + i.quantity * i.price, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, setQty, clear, count, total }}>
      {children}
    </CartContext.Provider>
  );
}
