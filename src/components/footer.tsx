import Link from "next/link";
import { ReturnIcon, TruckIcon, WalletIcon } from "@/components/icons";
import { shippingConfig, siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/money";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/women", label: "Women" },
      { href: "/men", label: "Men" },
      { href: "/shop?sort=newest", label: "New arrivals" },
      { href: "/shop", label: "All products" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/fit-finder", label: "Get your fit" },
      { href: "/help", label: "Shipping & help" },
      { href: "/cart", label: "Shopping bag" },
      { href: "/account", label: "My orders" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-card">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr] lg:px-8">
        <div>
          <p className="font-display text-2xl">{siteConfig.name}</p>
          <p className="mt-3 max-w-xs text-sm text-muted">{siteConfig.tagline}</p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">{column.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <ul className="space-y-4 text-sm">
          <li className="flex gap-3">
            <TruckIcon className="mt-0.5 shrink-0 text-accent" />
            <span>
              <strong className="block font-semibold">Free shipping</strong>
              <span className="text-muted">On orders over {formatMoney(shippingConfig.freeThreshold)}</span>
            </span>
          </li>
          <li className="flex gap-3">
            <WalletIcon className="mt-0.5 shrink-0 text-accent" />
            <span>
              <strong className="block font-semibold">Pay on delivery</strong>
              <span className="text-muted">Order online, pay when it arrives</span>
            </span>
          </li>
          <li className="flex gap-3">
            <ReturnIcon className="mt-0.5 shrink-0 text-accent" />
            <span>
              <strong className="block font-semibold">Cancel any time before dispatch</strong>
              <span className="text-muted">Your items go straight back on the shelf</span>
            </span>
          </li>
        </ul>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto w-full max-w-7xl px-4 py-5 text-xs text-muted sm:px-6 lg:px-8">
          © {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
