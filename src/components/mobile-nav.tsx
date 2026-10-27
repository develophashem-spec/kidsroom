"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon, SearchIcon } from "@/components/icons";

export type NavLink = { href: string; label: string };

export function MobileNav({ links }: { links: readonly NavLink[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-line/70"
      >
        <MenuIcon width={22} height={22} />
      </button>

      {open ? (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col bg-paper">
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <span className="font-display text-xl">Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              autoFocus
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-line/70"
            >
              <CloseIcon width={22} height={22} />
            </button>
          </div>
          <form action="/shop" role="search" className="border-b border-line p-4" onSubmit={() => setOpen(false)}>
            <label htmlFor="mobile-search" className="sr-only">
              Search products
            </label>
            <div className="flex items-center gap-2 rounded-full border border-line bg-card px-4">
              <SearchIcon width={18} height={18} className="text-muted" />
              <input
                id="mobile-search"
                name="q"
                type="search"
                placeholder="Search the store"
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>
          </form>
          <nav aria-label="Main" className="flex-1 overflow-y-auto p-4">
            <ul className="divide-y divide-line">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block py-4 font-display text-2xl"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
