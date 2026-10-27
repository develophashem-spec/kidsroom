import Link from "next/link";
import { ColorDots } from "@/components/color-dots";
import { Price } from "@/components/price";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui";
import { CATEGORY_LABELS, DEPARTMENT_LABELS } from "@/lib/catalog-constants";
import { discountPercent } from "@/lib/money";
import type { ProductDTO } from "@/lib/types";

export function ProductCard({ product, priority = false }: { product: ProductDTO; priority?: boolean }) {
  const discount = discountPercent(product.price, product.compareAtPrice);
  const color = product.colors[0];

  return (
    <article className="group">
      <Link href={`/products/${product.slug}`} className="block rounded-xl" aria-label={product.name}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-line">
          <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]">
            <ProductImage
              category={product.category}
              name={product.name}
              colorHex={color?.hex}
              image={product.images[0]}
              priority={priority}
            />
          </div>
          <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
            {!product.inStock ? <Badge tone="neutral">Sold out</Badge> : null}
            {product.inStock && discount > 0 ? <Badge tone="sale">-{discount}%</Badge> : null}
            {product.inStock && discount === 0 && product.featured ? <Badge tone="accent">Bestseller</Badge> : null}
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs tracking-wide text-muted">
            {DEPARTMENT_LABELS[product.department]} · {CATEGORY_LABELS[product.category]}
          </p>
          <h3 className="text-sm leading-snug font-medium text-ink group-hover:underline group-hover:underline-offset-4">
            {product.name}
          </h3>
          <Price price={product.price} compareAt={product.compareAtPrice} className="text-sm" />
          <ColorDots colors={product.colors} />
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products }: { products: readonly ProductDTO[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul aria-hidden="true" className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <div className="skeleton aspect-[4/5] rounded-xl" />
          <div className="skeleton mt-3 h-3 w-1/3 rounded" />
          <div className="skeleton mt-2 h-4 w-3/4 rounded" />
          <div className="skeleton mt-2 h-4 w-1/4 rounded" />
        </li>
      ))}
    </ul>
  );
}
