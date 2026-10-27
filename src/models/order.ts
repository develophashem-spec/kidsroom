import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  CATEGORIES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  type Category,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/catalog-constants";

/** A snapshot of what was bought, so later catalogue edits never rewrite order history. */
export interface OrderItem {
  product: Types.ObjectId;
  slug: string;
  name: string;
  category: Category;
  image: string | null;
  size: string;
  color: string;
  colorHex: string;
  /** Integer cents. */
  unitPrice: number;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface OrderStatusChange {
  status: OrderStatus;
  at: Date;
}

export interface OrderAttrs {
  orderNumber: string;
  user: Types.ObjectId;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  statusHistory: OrderStatusChange[];
  notes: string;
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderRecord = OrderAttrs & { _id: Types.ObjectId };

const itemSchema = new Schema<OrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    image: { type: String, default: null },
    size: { type: String, required: true },
    color: { type: String, required: true },
    colorHex: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0, validate: Number.isInteger },
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  },
  { _id: false },
);

const addressSchema = new Schema<ShippingAddress>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, default: "", trim: true },
    city: { type: String, required: true, trim: true },
    region: { type: String, default: "", trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const statusChangeSchema = new Schema<OrderStatusChange>(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderAttrs>(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [itemSchema], required: true },
    shippingAddress: { type: addressSchema, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "cod", required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "pending", required: true },
    statusHistory: { type: [statusChangeSchema], default: [] },
    notes: { type: String, default: "", maxlength: 500 },
    subtotal: { type: Number, required: true, min: 0, validate: Number.isInteger },
    shipping: { type: Number, required: true, min: 0, validate: Number.isInteger },
    total: { type: Number, required: true, min: 0, validate: Number.isInteger },
  },
  { timestamps: true, autoIndex: false, autoCreate: false },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order: Model<OrderAttrs> =
  (models.Order as Model<OrderAttrs> | undefined) ?? model<OrderAttrs>("Order", orderSchema);
