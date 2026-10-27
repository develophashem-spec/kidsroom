import Link from "next/link";
import { Suspense } from "react";
import { ArrowRightIcon, ReturnIcon, RulerIcon, TruckIcon, WalletIcon } from "@/components/icons";
import { ProductGrid, ProductGridSkeleton } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { ButtonLink, Container } from "@/components/ui";
import { shippingConfig } from "@/config/site";
import { listProducts } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";

export default function HomePage() {
  return (
    <>
      <Hero />
      <DepartmentTiles />
      <Container className="mt-20">
        <Suspense fallback={<ProductGridSkeleton count={4} />}>
          <Shelves />
        </Suspense>
      </Container>
      <FitBanner />
      <ValueProps />
    </>
  );
}

function Hero() {
  return (
    <section className="border-b border-line bg-[#f2ede4]">
      <Container className="grid items-center gap-12 py-12 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="mb-5 text-xs font-semibold tracking-[0.22em] text-accent uppercase">
            Men · Women · Made to fit
          </p>
          <h1 className="font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Dressed to <em className="text-accent">fit</em>.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">
            Modern essentials for men and women. Tell us your height, weight and how you like
            things to sit – we’ll pick your size. Order online, pay when it arrives.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/women" size="lg">
              Shop women
            </ButtonLink>
            <ButtonLink href="/men" size="lg" variant="secondary">
              Shop men
            </ButtonLink>
          </div>
          <Link
            href="/fit-finder"
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4 hover:text-accent"
          >
            Get your fit in 30 seconds <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>

        <div aria-hidden="true" className="mx-auto grid w-full max-w-lg grid-cols-2 gap-4">
          <div className="mt-10 aspect-[4/5] overflow-hidden rounded-2xl shadow-sm">
            <ProductImage category="dresses" name="Dress" colorHex="#2f4f3e" priority />
          </div>
          <div className="space-y-4">
            <div className="aspect-[4/5] overflow-hidden rounded-2xl shadow-sm">
              <ProductImage category="jackets" name="Jacket" colorHex="#b08968" priority />
            </div>
            <div className="aspect-[4/5] overflow-hidden rounded-2xl shadow-sm">
              <ProductImage category="jeans" name="Jeans" colorHex="#25406b" priority />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function DepartmentTiles() {
  const tiles = [
    {
      href: "/women",
      title: "Women",
      blurb: "Dresses, tailoring and easy everyday pieces.",
      category: "dresses",
      color: "#8c2f39",
      bg: "bg-[#efe1dc]",
    },
    {
      href: "/men",
      title: "Men",
      blurb: "Sharp shirts, great denim, honest basics.",
      category: "shirts",
      color: "#3f5f8a",
      bg: "bg-[#e1e6ec]",
    },
  ] as const;

  return (
    <Container className="mt-16">
      <ul className="grid gap-5 md:grid-cols-2">
        {tiles.map((tile) => (
          <li key={tile.href}>
            <Link
              href={tile.href}
              className={`group flex min-h-72 items-stretch justify-between overflow-hidden rounded-2xl ${tile.bg}`}
            >
              <div className="flex flex-col justify-between p-7 sm:p-9">
                <div>
                  <h2 className="font-display text-4xl tracking-tight">{tile.title}</h2>
                  <p className="mt-2 max-w-[16rem] text-sm text-ink/70">{tile.blurb}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  Shop {tile.title.toLowerCase()}
                  <ArrowRightIcon
                    width={16}
                    height={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </span>
              </div>
              <div aria-hidden="true" className="w-44 shrink-0 sm:w-56">
                <ProductImage category={tile.category} name={tile.title} colorHex={tile.color} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}

async function Shelves() {
  const [fresh, favourites] = await Promise.all([
    listProducts({ sort: "newest", page: 1, limit: 4 }),
    listProducts({ featured: true, sort: "featured", page: 1, limit: 4 }),
  ]);

  if (fresh.total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-16 text-center">
        <p className="font-display text-2xl">The shelves are being stocked.</p>
        <p className="mt-2 text-sm text-muted">New pieces are on their way – check back very soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-20">
      <section aria-labelledby="new-arrivals">
        <ShelfHeading id="new-arrivals" title="New arrivals" href="/shop?sort=newest" />
        <ProductGrid products={fresh.items} />
      </section>
      {favourites.items.length > 0 ? (
        <section aria-labelledby="favourites">
          <ShelfHeading id="favourites" title="Customer favourites" href="/shop" />
          <ProductGrid products={favourites.items} />
        </section>
      ) : null}
    </div>
  );
}

function ShelfHeading({ id, title, href }: { id: string; title: string; href: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <h2 id={id} className="font-display text-3xl tracking-tight sm:text-4xl">
        {title}
      </h2>
      <Link href={href} className="text-sm font-semibold underline underline-offset-4 hover:text-accent">
        View all
      </Link>
    </div>
  );
}

function FitBanner() {
  return (
    <section className="mt-24 bg-accent text-accent-ink">
      <Container className="grid items-center gap-12 py-16 lg:grid-cols-2">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.22em] uppercase opacity-80">
            <RulerIcon width={16} height={16} /> Get your fit
          </p>
          <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
            Stop guessing your size.
          </h2>
          <p className="mt-5 max-w-md text-lg opacity-85">
            Enter your height and weight and how you like clothes to fit – snug, regular or loose.
            We’ll recommend a size for every piece in the store, and your details never leave your
            device.
          </p>
          <ButtonLink
            href="/fit-finder"
            size="lg"
            className="mt-8 bg-paper! text-accent! hover:bg-white!"
          >
            Find my size
          </ButtonLink>
        </div>

        <div
          aria-hidden="true"
          className="mx-auto w-full max-w-md rounded-2xl bg-paper p-6 text-ink shadow-xl"
        >
          <p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">Your fit</p>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-line bg-card px-3.5 py-2.5">
              <dt className="text-xs text-muted">Height</dt>
              <dd className="font-semibold">172 cm</dd>
            </div>
            <div className="rounded-lg border border-line bg-card px-3.5 py-2.5">
              <dt className="text-xs text-muted">Weight</dt>
              <dd className="font-semibold">64 kg</dd>
            </div>
          </dl>
          <div className="mt-4 flex gap-2 text-sm">
            {["Snug", "Regular", "Loose"].map((label) => (
              <span
                key={label}
                className={`rounded-full border px-3.5 py-1.5 ${
                  label === "Regular" ? "border-ink bg-ink text-paper" : "border-line bg-card"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between rounded-xl bg-accent px-5 py-4 text-accent-ink">
            <span className="text-sm opacity-85">Recommended size</span>
            <span className="font-display text-4xl">M</span>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ValueProps() {
  const items = [
    {
      icon: TruckIcon,
      title: "Free shipping",
      text: `On every order over ${formatMoney(shippingConfig.freeThreshold)}.`,
    },
    { icon: WalletIcon, title: "Pay on delivery", text: "Order online now, pay when it arrives." },
    { icon: ReturnIcon, title: "Easy cancellations", text: "Changed your mind? Cancel before it ships." },
    { icon: RulerIcon, title: "Fit guidance", text: "Size recommendations built into every product." },
  ];
  return (
    <Container className="py-16">
      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-4">
            <Icon width={26} height={26} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Container>
  );
}
