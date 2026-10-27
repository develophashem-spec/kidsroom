import type { ProductFilters } from "@/lib/validation";

/** Query parameters the storefront catalogue understands (all optional, all strings). */
export type CatalogParam =
  | "department"
  | "category"
  | "size"
  | "color"
  | "fit"
  | "minPrice"
  | "maxPrice"
  | "q"
  | "sort"
  | "page";

const FILTER_PARAMS: readonly CatalogParam[] = [
  "department",
  "category",
  "size",
  "color",
  "fit",
  "minPrice",
  "maxPrice",
  "q",
  "sort",
];

/** 4990 -> "49.9", 5000 -> "50" (what the URL carries; see `parseMoneyToCents`). */
export function centsToUrlValue(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\.?0+$/, "");
}

/** The current filters as URL parameters, leaving out anything that is just a default. */
export function filtersToParams(filters: ProductFilters): Partial<Record<CatalogParam, string>> {
  const params: Partial<Record<CatalogParam, string>> = {};
  if (filters.department) params.department = filters.department;
  if (filters.category) params.category = filters.category;
  if (filters.size) params.size = filters.size;
  if (filters.color) params.color = filters.color;
  if (filters.fit) params.fit = filters.fit;
  if (filters.minPrice !== undefined) params.minPrice = centsToUrlValue(filters.minPrice);
  if (filters.maxPrice !== undefined) params.maxPrice = centsToUrlValue(filters.maxPrice);
  if (filters.q) params.q = filters.q;
  if (filters.sort !== "featured") params.sort = filters.sort;
  if (filters.page > 1) params.page = String(filters.page);
  return params;
}

type Overrides = Partial<Record<CatalogParam, string | undefined>>;

/**
 * Builds a catalogue URL from the current filters plus changes. Passing `undefined` removes a
 * parameter. Changing any filter sends the shopper back to page 1.
 * `fixedDepartment` is the department implied by the path (`/men`, `/women`), which is never
 * repeated in the query string.
 */
export function buildCatalogHref(
  basePath: string,
  filters: ProductFilters,
  overrides: Overrides = {},
  fixedDepartment?: string,
): string {
  const params: Overrides = filtersToParams(filters);
  const changesFilter = (Object.keys(overrides) as CatalogParam[]).some((key) => key !== "page");

  for (const [key, value] of Object.entries(overrides) as [CatalogParam, string | undefined][]) {
    if (value === undefined || value === "") delete params[key];
    else params[key] = value;
  }
  if (changesFilter && !("page" in overrides)) delete params.page;
  if (fixedDepartment) delete params.department;
  if (params.page === "1") delete params.page;
  if (params.sort === "featured") delete params.sort;

  const search = new URLSearchParams();
  for (const key of [...FILTER_PARAMS, "page" as const]) {
    const value = params[key];
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
