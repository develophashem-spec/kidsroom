import "server-only";
import type { QueryFilter } from "mongoose";
import { ApiError } from "@/lib/api";
import {
  complementaryCategories,
  type Department,
  type SortOption,
} from "@/lib/catalog-constants";
import { connectDB } from "@/lib/db";
import { toProductDTO } from "@/lib/dto";
import { isDuplicateKeyError } from "@/lib/mongo-errors";
import { slugify } from "@/lib/slug";
import type { ProductColorDTO, ProductDTO, ProductListDTO } from "@/lib/types";
import { escapeRegex, type ProductFilters, type ProductInput } from "@/lib/validation";
import { Product, type ProductAttrs, type ProductRecord } from "@/models";

const OBJECT_ID = /^[a-f\d]{24}$/i;

const SORTS: Record<SortOption, Record<string, 1 | -1>> = {
  featured: { featured: -1, createdAt: -1, _id: -1 },
  newest: { createdAt: -1, _id: -1 },
  "price-asc": { price: 1, _id: 1 },
  "price-desc": { price: -1, _id: 1 },
};

export type CatalogFilters = Partial<
  Pick<
    ProductFilters,
    | "department"
    | "category"
    | "size"
    | "color"
    | "fit"
    | "minPrice"
    | "maxPrice"
    | "q"
    | "featured"
  >
>;

/** Turns validated storefront filters into a MongoDB query (active products only). */
export function buildProductQuery(filters: CatalogFilters): QueryFilter<ProductAttrs> {
  const query: QueryFilter<ProductAttrs> = { isActive: true };

  if (filters.department) query.department = filters.department;
  if (filters.category) query.category = filters.category;
  if (filters.fit) query.fit = filters.fit;
  if (filters.featured) query.featured = true;

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const range: { $gte?: number; $lte?: number } = {};
    if (filters.minPrice !== undefined) range.$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) range.$lte = filters.maxPrice;
    query.price = range;
  }

  if (filters.size || filters.color) {
    // Only show products that can actually be bought in the chosen size / colour.
    query.variants = {
      $elemMatch: {
        ...(filters.size ? { size: filters.size } : {}),
        ...(filters.color ? { color: filters.color } : {}),
        stock: { $gt: 0 },
      },
    };
  }

  if (filters.q) {
    const pattern = new RegExp(escapeRegex(filters.q), "i");
    query.$or = [{ name: pattern }, { tags: pattern }, { description: pattern }];
  }

  return query;
}

export async function listProducts(
  filters: CatalogFilters & Pick<ProductFilters, "sort" | "page" | "limit">,
): Promise<ProductListDTO> {
  await connectDB();
  const query = buildProductQuery(filters);
  const pageSize = filters.limit;

  const [total, records] = await Promise.all([
    Product.countDocuments(query),
    Product.find(query)
      .sort(SORTS[filters.sort])
      .skip((filters.page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  return {
    items: records.map(toProductDTO),
    total,
    page: filters.page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProductBySlug(slug: string): Promise<ProductDTO | null> {
  await connectDB();
  const record = await Product.findOne({ slug: slug.toLowerCase(), isActive: true }).lean();
  return record ? toProductDTO(record) : null;
}

/** Colours currently sold (name + swatch), for the colour filter. */
export async function listColors(department?: Department): Promise<ProductColorDTO[]> {
  await connectDB();
  const rows = await Product.aggregate<{ _id: string; hex: string }>([
    { $match: { isActive: true, ...(department ? { department } : {}) } },
    { $unwind: "$colors" },
    { $group: { _id: "$colors.name", hex: { $first: "$colors.hex" } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((row) => ({ name: row._id, hex: row.hex }));
}

/** In-stock pieces from other categories that pair well with `product` ("Complete the look"). */
export async function getCompleteTheLook(product: ProductDTO, limit = 4): Promise<ProductDTO[]> {
  await connectDB();
  const records = await Product.find({
    isActive: true,
    department: product.department,
    category: { $in: complementaryCategories(product.category) },
    "variants.stock": { $gt: 0 },
  })
    .sort({ featured: -1, createdAt: -1, _id: -1 })
    .limit(24)
    .lean();

  const picked: ProductRecord[] = [];
  const usedCategories = new Set<string>();
  for (const record of records) {
    if (record._id.toString() === product.id || usedCategories.has(record.category)) continue;
    usedCategories.add(record.category);
    picked.push(record);
    if (picked.length === limit) break;
  }
  return picked.map(toProductDTO);
}

/* -------------------------------------------------------------------------- */
/* Admin                                                                      */
/* -------------------------------------------------------------------------- */

export function assertObjectId(id: string): void {
  if (!OBJECT_ID.test(id)) throw new ApiError(404, "Not found");
}

export async function listProductsForAdmin(options: {
  page: number;
  q?: string;
  pageSize?: number;
}): Promise<ProductListDTO> {
  await connectDB();
  const pageSize = options.pageSize ?? 20;
  const query: QueryFilter<ProductAttrs> = {};
  if (options.q) {
    const pattern = new RegExp(escapeRegex(options.q), "i");
    query.$or = [{ name: pattern }, { slug: pattern }, { tags: pattern }];
  }
  const [total, records] = await Promise.all([
    Product.countDocuments(query),
    Product.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((options.page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);
  return {
    items: records.map(toProductDTO),
    total,
    page: options.page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProductByIdForAdmin(id: string): Promise<ProductDTO | null> {
  if (!OBJECT_ID.test(id)) return null;
  await connectDB();
  const record = await Product.findById(id).lean();
  return record ? toProductDTO(record) : null;
}

function toProductFields(input: ProductInput): Omit<ProductAttrs, "slug" | "createdAt" | "updatedAt"> {
  return {
    name: input.name,
    description: input.description,
    details: input.details,
    department: input.department,
    category: input.category,
    fit: input.fit,
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    colors: input.colors,
    images: input.images,
    variants: input.variants,
    tags: input.tags,
    featured: input.featured,
    isActive: input.isActive,
  };
}

export async function createProduct(input: ProductInput): Promise<ProductDTO> {
  await connectDB();
  const fields = toProductFields(input);
  const base = input.slug ?? slugify(input.name);

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const slug = attempt === 0 ? base : `${base.slice(0, 70)}-${attempt + 1}`;
    try {
      const created = await Product.create({ ...fields, slug });
      return toProductDTO(created.toObject() as ProductRecord);
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      if (input.slug) throw new ApiError(409, "A product with this slug already exists");
    }
  }
  throw new ApiError(409, "Could not generate a unique slug – please enter one manually");
}

export async function updateProduct(id: string, input: ProductInput): Promise<ProductDTO> {
  assertObjectId(id);
  await connectDB();
  try {
    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: { ...toProductFields(input), ...(input.slug ? { slug: input.slug } : {}) } },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!updated) throw new ApiError(404, "Product not found");
    return toProductDTO(updated);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, "A product with this slug already exists");
    }
    throw error;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  assertObjectId(id);
  await connectDB();
  const result = await Product.deleteOne({ _id: id });
  if (result.deletedCount !== 1) throw new ApiError(404, "Product not found");
}

export type DashboardStats = {
  products: number;
  activeProducts: number;
  lowStockVariants: number;
  orders: number;
  pendingOrders: number;
  revenue: number;
};

export const LOW_STOCK_THRESHOLD = 3;

export async function getProductStats(): Promise<
  Pick<DashboardStats, "products" | "activeProducts" | "lowStockVariants">
> {
  await connectDB();
  const [products, activeProducts, low] = await Promise.all([
    Product.countDocuments({}),
    Product.countDocuments({ isActive: true }),
    Product.aggregate<{ count: number }>([
      { $match: { isActive: true } },
      { $unwind: "$variants" },
      { $match: { "variants.stock": { $lte: LOW_STOCK_THRESHOLD } } },
      { $count: "count" },
    ]),
  ]);
  return { products, activeProducts, lowStockVariants: low[0]?.count ?? 0 };
}
