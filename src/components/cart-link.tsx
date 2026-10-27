"use client";

import Link from "next/link";
import { BagIcon } from "@/components/icons";
import { useCartCount } from "@/lib/cart-store";

export function CartLink() {
  const count = useCartCount();
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Shopping bag, ${count} ${count === 1 ? "item" : "items"}` : "Shopping bag"}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-line/70"
    >
      <BagIcon width={22} height={22} />
      {count > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-ink">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
