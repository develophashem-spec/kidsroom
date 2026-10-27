"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";

export default function AddToCart({ product }) {
  const [size, setSize] = useState("");
  const { add } = useCart();
  const router = useRouter();
  return (
    <>
      <p><strong>Choose the fit:</strong></p>
      <div className="sizes">
        {product.sizes.map((s) => (
          <button key={s} type="button" className={`size ${size === s ? "sel" : ""}`} onClick={() => setSize(s)}>{s}</button>
        ))}
      </div>
      <button
        className="btn"
        disabled={!size || product.stock < 1}
        onClick={() => {
          add({ id: product._id, name: product.name, price: product.price, emoji: product.emoji, size });
          router.push("/cart");
        }}
      >
        {product.stock < 1 ? "Out of stock" : size ? "Add to cart" : "Select a size"}
      </button>
    </>
  );
}
