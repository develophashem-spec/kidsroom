/**
 * Plain, serialisable shapes that cross the server → client boundary (API responses and
 * props of client components). No ObjectIds or Dates – only strings, numbers and arrays.
 */
import type {
  Category,
  Department,
  OrderStatus,
  PaymentMethod,
  ProductFit,
} from "@/lib/catalog-constants";

export type UserRole = "customer" | "admin";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type ProductVariantDTO = { size: string; color: string; stock: number };
export type ProductColorDTO = { name: string; hex: string };

export type ProductDTO = {
  id: string;
  slug: string;
  name: string;
  description: string;
  details: string[];
  department: Department;
  category: Category;
  fit: ProductFit;
  /** Integer cents. */
  price: number;
  compareAtPrice: number | null;
  colors: ProductColorDTO[];
  images: string[];
  variants: ProductVariantDTO[];
  tags: string[];
  featured: boolean;
  isActive: boolean;
  inStock: boolean;
  createdAt: string;
};

export type ProductListDTO = {
  items: ProductDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type OrderItemDTO = {
  productId: string;
  slug: string;
  name: string;
  category: Category;
  image: string | null;
  size: string;
  color: string;
  colorHex: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type ShippingAddressDTO = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type OrderDTO = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  items: OrderItemDTO[];
  shippingAddress: ShippingAddressDTO;
  notes: string;
  subtotal: number;
  shipping: number;
  total: number;
  statusHistory: { status: OrderStatus; at: string }[];
  createdAt: string;
  updatedAt: string;
  /** Only present on admin responses. */
  customer?: { id: string; name: string; email: string } | null;
};

export type OrderListDTO = {
  items: OrderDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type QuoteLineStatus = "ok" | "insufficient" | "out_of_stock" | "unavailable";

export type QuoteLineDTO = {
  productId: string;
  slug: string;
  name: string;
  category: Category;
  image: string | null;
  size: string;
  color: string;
  colorHex: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  /** How many of this variant can be bought right now. */
  available: number;
  status: QuoteLineStatus;
};

export type QuoteDTO = {
  lines: QuoteLineDTO[];
  subtotal: number;
  shipping: number;
  total: number;
  freeShippingThreshold: number;
  /** True when at least one line cannot be fulfilled as requested. */
  hasIssues: boolean;
};
