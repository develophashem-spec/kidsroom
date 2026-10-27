import Link from "next/link";
import { Suspense } from "react";
import { CartLink } from "@/components/cart-link";
import { SearchIcon } from "@/components/icons";
import { MobileNav, type NavLink } from "@/components/mobile-nav";
import { UserMenu, UserMenuFallback } from "@/components/user-menu";
import { shippingConfig, siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/money";

export const NAV_LINKS: readonly NavLink[] = [
  { href: "/women", label: "Women" },
  { href: "/men", label: "Men" },
  { href: "/shop?sort=newest", label: "New in" },
  { href: "/fit-finder", label: "Get your fit" },
];

export function AnnouncementBar() {
  return (
    <div className="bg-ink px-4 py-2 text-center text-xs tracking-wide text-paper">
      Free shipping on orders over {formatMoney(shippingConfig.freeThreshold)} · Pay when it
      arrives · <Link href="/fit-finder" className="underline underline-offset-2">Find your size in 30 seconds</Link>
    </div>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <MobileNav links={NAV_LINKS} />

        <Link href="/" className="font-display text-2xl tracking-tight whitespace-nowrap sm:text-[1.7rem]">
          {siteConfig.name}
        </Link>

        <nav aria-label="Main" className="ml-8 hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium tracking-wide text-ink/80 transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <form action="/shop" role="search" className="hidden md:block">
            <label htmlFor="header-search" className="sr-only">
              Search products
            </label>
            <div className="flex h-10 items-center gap-2 rounded-full border border-line bg-card px-3.5 focus-within:border-accent">
              <SearchIcon width={17} height={17} className="text-muted" />
              <input
                id="header-search"
                name="q"
                type="search"
                placeholder="Search"
                autoComplete="off"
                className="w-28 bg-transparent text-sm outline-none placeholder:text-muted/70 lg:w-36"
              />
            </div>
          </form>
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
          <CartLink />
        </div>
      </div>
    </header>
  );
}
