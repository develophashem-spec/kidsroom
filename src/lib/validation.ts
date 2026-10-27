import { z } from "zod";
import { cartLimits } from "@/config/site";
import {
  CATEGORIES,
  DEPARTMENTS,
  DEPARTMENT_CATEGORIES,
  FITS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  SORT_OPTIONS,
  sizesFor,
} from "@/lib/catalog-constants";
import { MAX_PRICE_CENTS, parseMoneyToCents } from "@/lib/money";

/* -------------------------------------------------------------------------- */
/* Shared pieces                                                              */
/* -------------------------------------------------------------------------- */

export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .pipe(z.email("Enter a valid email address"));

/** bcrypt only looks at the first 72 bytes, so longer passwords are refused outright. */
const withinBcryptLimit = (value: string) => new TextEncoder().encode(value).length <= 72;

const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine(withinBcryptLimit, "Password must be at most 72 bytes");

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} is too short`)
    .max(max, `${label} is too long`);

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

export const registerSchema = z.object({
  name: trimmed(1, 80, "Name"),
  email: emailSchema,
  password: newPasswordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Password is required")
    .refine(withinBcryptLimit, "Password is too long"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/* -------------------------------------------------------------------------- */
/* Cart & orders                                                              */
/* -------------------------------------------------------------------------- */

export const cartLineSchema = z.object({
  productId: objectIdSchema,
  size: trimmed(1, 20, "Size"),
  color: trimmed(1, 40, "Colour"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(cartLimits.maxQuantityPerLine, `You can order up to ${cartLimits.maxQuantityPerLine} of an item`),
});
export type CartLineInput = z.infer<typeof cartLineSchema>;

export const cartQuoteSchema = z.object({
  lines: z.array(cartLineSchema).max(cartLimits.maxLines, "Your cart has too many items"),
});

export const shippingAddressSchema = z.object({
  fullName: trimmed(2, 100, "Full name"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\-.\s]{6,30}$/, "Enter a valid phone number"),
  line1: trimmed(3, 150, "Address"),
  line2: z.string().trim().max(150, "Address line 2 is too long").default(""),
  city: trimmed(2, 80, "City"),
  region: z.string().trim().max(80, "State / region is too long").default(""),
  postalCode: trimmed(2, 20, "Postal code"),
  country: trimmed(2, 60, "Country"),
});
export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;

export const createOrderSchema = z.object({
  lines: z
    .array(cartLineSchema)
    .min(1, "Your cart is empty")
    .max(cartLimits.maxLines, "Your cart has too many items"),
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(PAYMENT_METHODS).default("cod"),
  notes: z.string().trim().max(500, "Notes are too long").default(""),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

/* -------------------------------------------------------------------------- */
/* Catalogue filters (lenient: invalid values are ignored, never an error)    */
/* -------------------------------------------------------------------------- */

const firstValue = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const optionalText = (max: number) =>
  z.preprocess(
    firstValue,
    z
      .string()
      .trim()
      .min(1)
      .max(max)
      .optional()
      .catch(undefined),
  );

const optionalPrice = z.preprocess(
  firstValue,
  z
    .string()
    .transform((value, ctx) => {
      const cents = parseMoneyToCents(value);
      if (cents === null) {
        ctx.addIssue({ code: "custom", message: "Invalid price" });
        return z.NEVER;
      }
      return cents;
    })
    .optional()
    .catch(undefined),
);

export const productFiltersSchema = z.object({
  department: z.preprocess(firstValue, z.enum(DEPARTMENTS).optional().catch(undefined)),
  category: z.preprocess(firstValue, z.enum(CATEGORIES).optional().catch(undefined)),
  size: optionalText(20),
  color: optionalText(40),
  fit: z.preprocess(firstValue, z.enum(FITS).optional().catch(undefined)),
  /** Minimum / maximum price, in minor units after parsing (the URL carries "49.90"). */
  minPrice: optionalPrice,
  maxPrice: optionalPrice,
  q: optionalText(80),
  featured: z.preprocess(
    firstValue,
    z
      .string()
      .optional()
      .transform((value) => value === "true" || value === "1"),
  ),
  sort: z.preprocess(firstValue, z.enum(SORT_OPTIONS).catch("featured")),
  page: z.preprocess(firstValue, z.coerce.number().int().min(1).max(1000).catch(1)),
  limit: z.preprocess(firstValue, z.coerce.number().int().min(1).max(48).catch(12)),
});
export type ProductFilters = z.infer<typeof productFiltersSchema>;

/** Turns URL search params (or a Next.js `searchParams` object) into validated filters. */
export function parseProductFilters(
  raw: Record<string, string | string[] | undefined> | URLSearchParams,
): ProductFilters {
  const input: Record<string, string | string[] | undefined> =
    raw instanceof URLSearchParams ? Object.fromEntries(raw.entries()) : raw;
  return productFiltersSchema.parse(input);
}

/* -------------------------------------------------------------------------- */
/* Admin: products                                                            */
/* -------------------------------------------------------------------------- */

function isSafeImageUrl(value: string): boolean {
  if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1f4d3a");

export const productInputSchema = z
  .object({
    name: trimmed(2, 120, "Name"),
    slug: slugSchema.optional(),
    description: z.string().trim().max(2000, "Description is too long").default(""),
    details: z
      .array(trimmed(1, 200, "Detail"))
      .max(10, "Add at most 10 detail lines")
      .default([]),
    department: z.enum(DEPARTMENTS),
    category: z.enum(CATEGORIES),
    fit: z.enum(FITS).default("regular"),
    price: z
      .number()
      .int("Price must be in whole cents")
      .min(1, "Price must be greater than zero")
      .max(MAX_PRICE_CENTS, "Price is too high"),
    compareAtPrice: z
      .number()
      .int("Compare-at price must be in whole cents")
      .max(MAX_PRICE_CENTS, "Compare-at price is too high")
      .nullable()
      .default(null),
    colors: z
      .array(z.object({ name: trimmed(1, 40, "Colour name"), hex: hexColorSchema }))
      .min(1, "Add at least one colour")
      .max(8, "Add at most 8 colours"),
    images: z
      .array(
        z
          .string()
          .trim()
          .max(500, "Image URL is too long")
          .refine(isSafeImageUrl, "Image must be an http(s) URL or a /path"),
      )
      .max(8, "Add at most 8 images")
      .default([]),
    variants: z
      .array(
        z.object({
          size: trimmed(1, 20, "Size"),
          color: trimmed(1, 40, "Colour"),
          stock: z
            .number()
            .int("Stock must be a whole number")
            .min(0, "Stock cannot be negative")
            .max(100_000, "Stock is too high"),
        }),
      )
      .min(1, "Add at least one size / colour variant")
      .max(200, "Too many variants"),
    tags: z.array(trimmed(1, 30, "Tag")).max(10, "Add at most 10 tags").default([]),
    featured: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .superRefine((product, ctx) => {
    if (!DEPARTMENT_CATEGORIES[product.department].includes(product.category)) {
      ctx.addIssue({
        code: "custom",
        path: ["category"],
        message: "This category is not sold in the selected department",
      });
    }

    if (product.compareAtPrice !== null && product.compareAtPrice <= product.price) {
      ctx.addIssue({
        code: "custom",
        path: ["compareAtPrice"],
        message: "Compare-at price must be higher than the price",
      });
    }

    const colorNames = new Set<string>();
    product.colors.forEach((color, index) => {
      const key = color.name.toLowerCase();
      if (colorNames.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["colors", index, "name"],
          message: "Colour names must be unique",
        });
      }
      colorNames.add(key);
    });

    const allowedSizes = new Set(sizesFor(product.department, product.category));
    const seen = new Set<string>();
    product.variants.forEach((variant, index) => {
      if (!allowedSizes.has(variant.size)) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "size"],
          message: `Size must be one of: ${[...allowedSizes].join(", ")}`,
        });
      }
      if (!product.colors.some((color) => color.name === variant.color)) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "color"],
          message: "Variant colour must match one of the product colours",
        });
      }
      const key = `${variant.size}|${variant.color}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index],
          message: "Each size / colour combination can only be listed once",
        });
      }
      seen.add(key);
    });
  });
export type ProductInput = z.infer<typeof productInputSchema>;

/* -------------------------------------------------------------------------- */
/* Admin: listing                                                             */
/* -------------------------------------------------------------------------- */

const pageNumber = z.coerce.number().int().min(1).max(1000).catch(1);

export const pageParamSchema = z.preprocess(firstValue, pageNumber);

/** A `?page=` value as a safe page number (falls back to 1 for anything invalid). */
export function parsePage(value: string | null | undefined): number {
  return pageNumber.parse(value ?? undefined);
}

export const adminProductListSchema = z.object({
  page: pageParamSchema,
  q: optionalText(80),
});

export const adminOrderListSchema = z.object({
  page: pageParamSchema,
  status: z.preprocess(firstValue, z.enum(ORDER_STATUSES).optional().catch(undefined)),
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export type ValidationIssue = { path: string; message: string };

export function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
}

/** Escapes user text so it can be embedded safely inside a `RegExp`. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
