import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { Price } from "@/components/price";
import { ProductGrid, ProductGridSkeleton } from "@/components/product-card";
import { ProductView } from "@/components/product-view";
import { SizeChart } from "@/components/size-chart";
import { Badge, Container, Skeleton } from "@/components/ui";
import { shippingConfig } from "@/config/site";
import { getCompleteTheLook, getProductBySlug } from "@/lib/catalog";
import {
  CATEGORY_LABELS,
  DEPARTMENT_LABELS,
  FIT_DESCRIPTIONS,
  FIT_LABELS,
} from "@/lib/catalog-constants";
import { discountPercent, formatMoney } from "@/lib/money";
import type { ProductDTO } from "@/lib/types";

type Params = PageProps<"/products/[slug]">["params"];

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return { title: product.name, description: product.description.slice(0, 160) };
}

export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <Container className="py-8 sm:py-12">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetail params={props.params} />
      </Suspense>
    </Container>
  );
}

function ProductSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
      <Skeleton className="aspect-[4/5] rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

async function ProductDetail({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <ProductView product={product} intro={<Intro product={product} />} extras={<Extras product={product} />} />
      <Suspense fallback={<ShelfSkeleton />}>
        <CompleteTheLook product={product} />
      </Suspense>
    </>
  );
}

function Intro({ product }: { product: ProductDTO }) {
  const discount = discountPercent(product.price, product.compareAtPrice);
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${product.department}`} className="hover:text-ink">
              {DEPARTMENT_LABELS[product.department]}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${product.department}?category=${product.category}`} className="hover:text-ink">
              {CATEGORY_LABELS[product.category]}
            </Link>
          </li>
        </ol>
      </nav>

      <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">{product.name}</h1>
      <div className="mt-4 flex items-center gap-3">
        <Price price={product.price} compareAt={product.compareAtPrice} className="text-xl" />
        {discount > 0 ? <Badge tone="sale">Save {discount}%</Badge> : null}
      </div>
      <p className="mt-5 leading-relaxed text-muted">{product.description}</p>
      <p className="mt-4 flex items-start gap-3 text-sm">
        <Badge tone="neutral" className="mt-0.5 shrink-0">
          {FIT_LABELS[product.fit]}
        </Badge>
        <span className="text-muted">{FIT_DESCRIPTIONS[product.fit]}</span>
      </p>
    </>
  );
}

function Disclosure({
  title,
  id,
  defaultOpen = false,
  children,
}: {
  title: string;
  id?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details id={id} open={defaultOpen} className="group py-1">
      <summary className="flex cursor-pointer items-center justify-between py-3 text-sm font-semibold">
        {title}
        <ChevronDownIcon width={18} height={18} className="chevron text-muted transition-transform" />
      </summary>
      <div className="pb-4 text-sm text-muted">{children}</div>
    </details>
  );
}

function Extras({ product }: { product: ProductDTO }) {
  return (
    <div className="mt-10 divide-y divide-line border-y border-line">
      {product.details.length > 0 ? (
        <Disclosure title="Details & care" defaultOpen>
          <ul className="list-disc space-y-1.5 pl-5">
            {product.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
      <Disclosure title="Size guide" id="size-guide">
        <SizeChart department={product.department} />
        <p className="mt-3">
          Between sizes? Try our{" "}
          <Link href="/fit-finder" className="font-medium text-ink underline underline-offset-4">
            fit finder
          </Link>
          .
        </p>
      </Disclosure>
      <Disclosure title="Shipping & payment">
        <p>
          Flat-rate shipping of {formatMoney(shippingConfig.flatRate)} – free on orders over{" "}
          {formatMoney(shippingConfig.freeThreshold)}. You pay in cash when your order arrives, and you can
          cancel it from your account any time before it ships.
        </p>
      </Disclosure>
    </div>
  );
}

function ShelfSkeleton() {
  return (
    <div className="mt-20">
      <Skeleton className="mb-8 h-9 w-64" />
      <ProductGridSkeleton count={4} />
    </div>
  );
}

async function CompleteTheLook({ product }: { product: ProductDTO }) {
  const items = await getCompleteTheLook(product, 4);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="complete-the-look" className="mt-20">
      <h2 id="complete-the-look" className="mb-8 font-display text-3xl tracking-tight sm:text-4xl">
        Complete the look
      </h2>
      <ProductGrid products={items} />
    </section>
  );
}
