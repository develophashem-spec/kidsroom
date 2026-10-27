"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";

export default function Checkout() {
  const { items, total, clear } = useCart();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(e.target));
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: f,
        items: items.map((i) => ({ product: i.id, size: i.size, quantity: i.quantity })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not place order");
      setBusy(false);
      return;
    }
    clear();
    router.push(`/order/${data._id}`);
  }

  if (!items.length) return <p>Your cart is empty.</p>;
  return (
    <>
      <h1>Checkout</h1>
      <p>Total: <strong>${total.toFixed(2)}</strong> (pay on delivery)</p>
      <form className="checkout" onSubmit={submit}>
        <input name="name" placeholder="Full name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="phone" placeholder="Phone" />
        <textarea name="address" placeholder="Delivery address" required rows={3} />
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? "Placing..." : "Place order"}</button>
      </form>
    </>
  );
}
