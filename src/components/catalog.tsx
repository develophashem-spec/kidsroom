import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ProductGrid, ProductGridSkeleton } from "@/components/product-card";
import { ButtonLink, Container, PageHeading, Skeleton } from "@/components/ui";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CLOTHING_SIZES,
  DEPARTMENTS,
  DEPARTMENT_CATEGORIES,
  DEPARTMENT_LABELS,
  FITS,
  FIT_LABELS,
  SHOE_SIZES,
  SORT_LABELS,
  SORT_OPTIONS,
  type Category,
  type Department,
} from "@/lib/catalog-constants";
import { listColors, listProducts } from "@/lib/catalog";
import { buildCatalogHref, filtersToParams, type CatalogParam } from "@/lib/catalog-url";
import { formatMoney } from "@/lib/money";
import type { ProductColorDTO } from "@/lib/types";
import { parseProductFilters, type ProductFilters } from "@/lib/validation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type CatalogPageProps = {
  /** Fixed by the route (`/men`, `/women`); `/shop` lets visitors pick. */
  department?: Department;
  basePath: string;
  searchParams: SearchParams;
};

const INTROS: Record<string, string> = {
  women: "Dresses, easy tailoring and everyday pieces – cut to fit the way you want to wear them.",
  men: "Sharp shirts, great denim and everyday essentials – cut to fit the way you want to wear them.",
  all: "Everything in one place. Filter by size to see only what you can actually buy today.",
};

export function CatalogPage({ department, basePath, searchParams }: CatalogPageProps) {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeading
        eyebrow={department ? "Shop" : "The full collection"}
        title={department ? DEPARTMENT_LABELS[department] : "All products"}
      >
        {INTROS[department ?? "all"]}
      </PageHeading>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogResults department={department} basePath={basePath} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

function CatalogSkeleton() {
  return (
    <div className="gap-10 lg:grid lg:grid-cols-[15rem_1fr]">
      <div className="hidden space-y-4 lg:block">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <ProductGridSkeleton />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

type HrefBuilder = (overrides?: Partial<Record<CatalogParam, string | undefined>>) => string;

async function CatalogResults({ department, basePath, searchParams }: CatalogPageProps) {
  const parsed = parseProductFilters(await searchParams);
  const filters: ProductFilters = department ? { ...parsed, department } : parsed;
  const [list, colors] = await Promise.all([listProducts(filters), listColors(filters.department)]);

  const href: HrefBuilder = (overrides = {}) => buildCatalogHref(basePath, filters, overrides, department);
  const active = activeFilters(filters, href, Boolean(department));

  const panel = (
    <FilterPanel
      filters={filters}
      colors={colors}
      href={href}
      basePath={basePath}
      fixedDepartment={Boolean(department)}
    />
  );

  return (
    <div className="gap-10 lg:grid lg:grid-cols-[15rem_1fr]">
      <details className="group mb-6 rounded-xl border border-line bg-card lg:hidden">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold">
          <span>Filters{active.length > 0 ? ` (${active.length})` : ""}</span>
          <span aria-hidden="true" className="chevron text-muted transition-transform">
            ▾
          </span>
        </summary>
        <div className="border-t border-line p-4">{panel}</div>
      </details>
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">{panel}</div>
      </aside>

      <section aria-label="Products">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line pb-4">
          <p className="text-sm text-muted" aria-live="polite">
            {filters.q ? (
              <>
                {list.total} {list.total === 1 ? "result" : "results"} for{" "}
                <strong className="text-ink">“{filters.q}”</strong>
              </>
            ) : (
              <>
                {list.total} {list.total === 1 ? "product" : "products"}
              </>
            )}
          </p>
          <nav aria-label="Sort" className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="mr-1 text-muted">Sort:</span>
            {SORT_OPTIONS.map((option) => (
              <Chip key={option} href={href({ sort: option })} active={filters.sort === option}>
                {SORT_LABELS[option]}
              </Chip>
            ))}
          </nav>
        </div>

        {active.length > 0 ? (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {active.map((item) => (
              <Link
                key={item.label}
                href={item.removeHref}
                scroll={false}
                aria-label={`Remove filter: ${item.label}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-line px-3 py-1 text-xs font-medium hover:bg-ink hover:text-paper"
              >
                {item.label} <span aria-hidden="true">×</span>
              </Link>
            ))}
            <Link href={basePath} className="text-xs font-medium underline underline-offset-4">
              Clear all
            </Link>
          </div>
        ) : null}

        {list.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-card px-6 py-16 text-center">
            <p className="font-display text-2xl">Nothing matches that – yet.</p>
            <p className="mt-2 text-sm text-muted">
              {list.total > 0
                ? "That page doesn’t exist. Head back to the first page of results."
                : "Try removing a filter or searching for something else."}
            </p>
            <ButtonLink
              href={list.total > 0 ? href({ page: undefined }) : basePath}
              variant="secondary"
              className="mt-6"
            >
              {list.total > 0 ? "Back to page 1" : "Clear all filters"}
            </ButtonLink>
          </div>
        ) : (
          <>
            <ProductGrid products={list.items} />
            <Pagination page={list.page} pageCount={list.pageCount} href={href} />
          </>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

function sizeOptions(category: Category | undefined, department: Department | undefined): readonly string[] {
  if (category === "accessories") return [];
  if (category === "shoes") {
    if (department) return SHOE_SIZES[department];
    return [...new Set([...SHOE_SIZES.women, ...SHOE_SIZES.men])].sort();
  }
  return CLOTHING_SIZES;
}

function activeFilters(filters: ProductFilters, href: HrefBuilder, fixedDepartment: boolean) {
  const items: { label: string; removeHref: string }[] = [];
  if (filters.department && !fixedDepartment) {
    items.push({
      label: DEPARTMENT_LABELS[filters.department],
      removeHref: href({ department: undefined }),
    });
  }
  if (filters.category) {
    items.push({ label: CATEGORY_LABELS[filters.category], removeHref: href({ category: undefined }) });
  }
  if (filters.size) items.push({ label: `Size ${filters.size}`, removeHref: href({ size: undefined }) });
  if (filters.color) items.push({ label: filters.color, removeHref: href({ color: undefined }) });
  if (filters.fit) items.push({ label: FIT_LABELS[filters.fit], removeHref: href({ fit: undefined }) });
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const from = filters.minPrice !== undefined ? formatMoney(filters.minPrice) : null;
    const to = filters.maxPrice !== undefined ? formatMoney(filters.maxPrice) : null;
    items.push({
      label: from && to ? `${from} – ${to}` : from ? `From ${from}` : `Up to ${to}`,
      removeHref: href({ minPrice: undefined, maxPrice: undefined }),
    });
  }
  if (filters.q) items.push({ label: `“${filters.q}”`, removeHref: href({ q: undefined }) });
  return items;
}

function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line pb-6 last:border-0">
      <h3 className="mb-3 text-xs font-semibold tracking-[0.18em] text-muted uppercase">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function FilterPanel({
  filters,
  colors,
  href,
  basePath,
  fixedDepartment,
}: {
  filters: ProductFilters;
  colors: readonly ProductColorDTO[];
  href: HrefBuilder;
  basePath: string;
  fixedDepartment: boolean;
}) {
  const categories: readonly Category[] = filters.department
    ? DEPARTMENT_CATEGORIES[filters.department]
    : CATEGORIES;
  const sizes = sizeOptions(filters.category, filters.department);

  // Keep the chosen size when it still makes sense for the new category.
  const sizeStillValid = (category: Category | undefined) =>
    !filters.size || sizeOptions(category, filters.department).includes(filters.size);

  const hidden = filtersToParams(filters);
  delete hidden.page;
  delete hidden.minPrice;
  delete hidden.maxPrice;
  if (fixedDepartment) delete hidden.department;

  return (
    <div className="space-y-6">
      {!fixedDepartment ? (
        <FilterGroup title="Department">
          <Chip href={href({ department: undefined, category: undefined })} active={!filters.department}>
            All
          </Chip>
          {DEPARTMENTS.map((department) => (
            <Chip
              key={department}
              href={href({
                department,
                category:
                  filters.category && DEPARTMENT_CATEGORIES[department].includes(filters.category)
                    ? filters.category
                    : undefined,
              })}
              active={filters.department === department}
            >
              {DEPARTMENT_LABELS[department]}
            </Chip>
          ))}
        </FilterGroup>
      ) : null}

      <FilterGroup title="Category">
        {categories.map((category) => (
          <Chip
            key={category}
            href={href({
              category: filters.category === category ? undefined : category,
              ...(sizeStillValid(filters.category === category ? undefined : category) ? {} : { size: undefined }),
            })}
            active={filters.category === category}
          >
            {CATEGORY_LABELS[category]}
          </Chip>
        ))}
      </FilterGroup>

      {sizes.length > 0 ? (
        <FilterGroup title="Size">
          {sizes.map((size) => (
            <Chip
              key={size}
              href={href({ size: filters.size === size ? undefined : size })}
              active={filters.size === size}
            >
              {size}
            </Chip>
          ))}
        </FilterGroup>
      ) : null}

      {colors.length > 0 ? (
        <FilterGroup title="Colour">
          {colors.map((color) => (
            <Chip
              key={color.name}
              href={href({ color: filters.color === color.name ? undefined : color.name })}
              active={filters.color === color.name}
            >
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full border border-ink/20"
                style={{ backgroundColor: color.hex }}
              />
              {color.name}
            </Chip>
          ))}
        </FilterGroup>
      ) : null}

      <FilterGroup title="Fit">
        {FITS.map((fit) => (
          <Chip
            key={fit}
            href={href({ fit: filters.fit === fit ? undefined : fit })}
            active={filters.fit === fit}
          >
            {FIT_LABELS[fit]}
          </Chip>
        ))}
      </FilterGroup>

      <section>
        <h3 className="mb-3 text-xs font-semibold tracking-[0.18em] text-muted uppercase">Price</h3>
        <form
          key={`${filters.minPrice ?? ""}-${filters.maxPrice ?? ""}`}
          action={basePath}
          method="get"
          className="flex items-end gap-2"
        >
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <label className="block flex-1 text-xs text-muted">
            Min
            <input
              name="minPrice"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              defaultValue={filters.minPrice !== undefined ? filters.minPrice / 100 : undefined}
              className="mt-1 block w-full rounded-lg border border-line bg-card px-2.5 py-2 text-sm text-ink"
            />
          </label>
          <label className="block flex-1 text-xs text-muted">
            Max
            <input
              name="maxPrice"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              defaultValue={filters.maxPrice !== undefined ? filters.maxPrice / 100 : undefined}
              className="mt-1 block w-full rounded-lg border border-line bg-card px-2.5 py-2 text-sm text-ink"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-paper hover:bg-accent"
          >
            Go
          </button>
        </form>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                 */
/* -------------------------------------------------------------------------- */

function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...wanted].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  pages.forEach((value, index) => {
    if (index > 0 && value - pages[index - 1] > 1) result.push("gap");
    result.push(value);
  });
  return result;
}

function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: HrefBuilder }) {
  if (pageCount <= 1) return null;
  const link = "inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm";
  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href({ page: String(page - 1) })} className={`${link} border-line bg-card hover:border-ink`}>
          ← Previous
        </Link>
      ) : null}
      {pageWindow(page, pageCount).map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={href({ page: String(entry) })}
            aria-current={entry === page ? "page" : undefined}
            aria-label={`Page ${entry}`}
            className={`${link} ${
              entry === page ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink"
            }`}
          >
            {entry}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href({ page: String(page + 1) })} className={`${link} border-line bg-card hover:border-ink`}>
          Next →
        </Link>
      ) : null}
    </nav>
  );
}
