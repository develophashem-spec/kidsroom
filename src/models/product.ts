import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  CATEGORIES,
  DEPARTMENTS,
  FITS,
  type Category,
  type Department,
  type ProductFit,
} from "@/lib/catalog-constants";

export interface ProductVariant {
  size: string;
  color: string;
  stock: number;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductAttrs {
  name: string;
  slug: string;
  description: string;
  details: string[];
  department: Department;
  category: Category;
  fit: ProductFit;
  /** Integer cents. */
  price: number;
  /** "Was" price in integer cents, shown struck through when higher than `price`. */
  compareAtPrice: number | null;
  colors: ProductColor[];
  images: string[];
  variants: ProductVariant[];
  tags: string[];
  featured: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductRecord = ProductAttrs & { _id: Types.ObjectId };

const variantSchema = new Schema<ProductVariant>(
  {
    size: { type: String, required: true, trim: true, maxlength: 20 },
    color: { type: String, required: true, trim: true, maxlength: 40 },
    stock: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
  },
  { _id: false },
);

const colorSchema = new Schema<ProductColor>(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    hex: { type: String, required: true, match: /^#[0-9a-fA-F]{6}$/ },
  },
  { _id: false },
);

const productSchema = new Schema<ProductAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: "", maxlength: 2000 },
    details: { type: [String], default: [] },
    department: { type: String, enum: DEPARTMENTS, required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    fit: { type: String, enum: FITS, default: "regular", required: true },
    price: { type: Number, required: true, min: 0, validate: Number.isInteger },
    compareAtPrice: {
      type: Number,
      default: null,
      min: 0,
      validate: (value: number | null) => value === null || Number.isInteger(value),
    },
    colors: { type: [colorSchema], default: [] },
    images: { type: [String], default: [] },
    variants: { type: [variantSchema], default: [] },
    tags: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, autoIndex: false, autoCreate: false },
);

productSchema.index({ isActive: 1, department: 1, category: 1, createdAt: -1 });
productSchema.index({ isActive: 1, featured: -1, createdAt: -1 });
productSchema.index({ isActive: 1, price: 1 });

export const Product: Model<ProductAttrs> =
  (models.Product as Model<ProductAttrs> | undefined) ??
  model<ProductAttrs>("Product", productSchema);
