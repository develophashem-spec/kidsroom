"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";

export default function Header() {
  const { count } = useCart();
  return (
    <header className="header">
      <Link href="/" className="logo">🧸 KidsRoom</Link>
      <nav>
        <Link href="/products">Shop</Link>
        <Link href="/products?category=girls">Girls</Link>
        <Link href="/products?category=boys">Boys</Link>
        <Link href="/products?category=baby">Baby</Link>
        <Link href="/cart">Cart ({count})</Link>
      </nav>
    </header>
  );
}
