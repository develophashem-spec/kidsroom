/**
 * Catalogue vocabulary shared by the database models, the API validation and the UI.
 * This file must stay free of server-only imports so client components can use it.
 */

export const DEPARTMENTS = ["men", "women"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  men: "Men",
  women: "Women",
};

export const CATEGORIES = [
  "tshirts",
  "shirts",
  "tops",
  "hoodies",
  "knitwear",
  "jackets",
  "jeans",
  "trousers",
  "shorts",
  "dresses",
  "skirts",
  "shoes",
  "accessories",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  tshirts: "T-Shirts",
  shirts: "Shirts",
  tops: "Tops",
  hoodies: "Hoodies & Sweats",
  knitwear: "Knitwear",
  jackets: "Jackets & Coats",
  jeans: "Jeans",
  trousers: "Trousers",
  shorts: "Shorts",
  dresses: "Dresses",
  skirts: "Skirts",
  shoes: "Shoes",
  accessories: "Accessories",
};

/** Which categories are sold in which department (drives filters and the admin form). */
export const DEPARTMENT_CATEGORIES: Record<Department, readonly Category[]> = {
  men: [
    "tshirts",
    "shirts",
    "hoodies",
    "knitwear",
    "jackets",
    "jeans",
    "trousers",
    "shorts",
    "shoes",
    "accessories",
  ],
  women: [
    "tops",
    "dresses",
    "skirts",
    "hoodies",
    "knitwear",
    "jackets",
    "jeans",
    "trousers",
    "shoes",
    "accessories",
  ],
};

export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type ClothingSize = (typeof CLOTHING_SIZES)[number];

/** EU shoe sizes. */
export const SHOE_SIZES: Record<Department, readonly string[]> = {
  men: ["40", "41", "42", "43", "44", "45", "46"],
  women: ["36", "37", "38", "39", "40", "41", "42"],
};

export const ONE_SIZE = "One size";

/** Garments that the "Get Your Fit" size finder can recommend a size for. */
export function isFitCategory(category: Category): boolean {
  return category !== "shoes" && category !== "accessories";
}

/** The size labels a product of this department/category can be sold in. */
export function sizesFor(
  department: Department,
  category: Category,
): readonly string[] {
  if (category === "shoes") return SHOE_SIZES[department];
  if (category === "accessories") return [ONE_SIZE];
  return CLOTHING_SIZES;
}

export const FITS = ["slim", "regular", "relaxed", "oversized"] as const;
export type ProductFit = (typeof FITS)[number];

export const FIT_LABELS: Record<ProductFit, string> = {
  slim: "Slim fit",
  regular: "Regular fit",
  relaxed: "Relaxed fit",
  oversized: "Oversized fit",
};

export const FIT_DESCRIPTIONS: Record<ProductFit, string> = {
  slim: "Cut close to the body. Size up if you are between sizes or like more room.",
  regular: "True to size with a classic, comfortable cut.",
  relaxed: "A little roomier through the body for an easy, laid-back feel.",
  oversized:
    "Cut generously for a boxy, statement silhouette. Size down for a more regular look.",
};

export const SORT_OPTIONS = ["featured", "newest", "price-asc", "price-desc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Allowed order status changes. Cancelling an order puts its items back in stock. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export const PAYMENT_METHODS = ["cod"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on delivery",
};
