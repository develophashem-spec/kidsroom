"use client";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export default function Cart() {
  const { items, remove, setQty, total } = useCart();
  if (!items.length) return <><h1>Your cart</h1><p>Your cart is empty. <Link href="/products">Keep shopping</Link></p></>;
  return (
    <>
      <h1>Your cart</h1>
      <table>
        <thead><tr><th>Item</th><th>Size</th><th>Qty</th><th>Price</th><th></th></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id + i.size}>
              <td>{i.emoji} {i.name}</td>
              <td>{i.size}</td>
              <td><input type="number" min="1" value={i.quantity} style={{ width: 70 }} onChange={(e) => setQty(i.id, i.size, Number(e.target.value) || 1)} /></td>
              <td>${(i.price * i.quantity).toFixed(2)}</td>
              <td><button onClick={() => remove(i.id, i.size)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Total: ${total.toFixed(2)}</h2>
      <Link href="/checkout" className="btn">Checkout</Link>
    </>
  );
}
