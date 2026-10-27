import "server-only";
import { randomBytes } from "node:crypto";
import { Types, type QueryFilter } from "mongoose";
import { ApiError } from "@/lib/api";
import { quoteCart } from "@/lib/cart";
import {
  ORDER_STATUS_TRANSITIONS,
  type OrderStatus,
} from "@/lib/catalog-constants";
import { connectDB } from "@/lib/db";
import { toOrderDTO } from "@/lib/dto";
import { isDuplicateKeyError } from "@/lib/mongo-errors";
import type { OrderDTO, OrderListDTO } from "@/lib/types";
import type { CreateOrderInput } from "@/lib/validation";
import {
  Order,
  Product,
  User,
  type OrderAttrs,
  type OrderItem,
  type OrderRecord,
} from "@/models";

const OBJECT_ID = /^[a-f\d]{24}$/i;
const ORDER_NUMBER_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32

/** e.g. `TF-7K3M9QX2` – random, so order numbers do not reveal how many orders exist. */
export function generateOrderNumber(): string {
  let suffix = "";
  for (const byte of randomBytes(8)) suffix += ORDER_NUMBER_ALPHABET[byte % 32];
  return `TF-${suffix}`;
}

type StockLine = { productId: string; size: string; color: string; quantity: number };

/** Puts items back on the shelf. Best effort: a failure is logged, never thrown. */
async function releaseStock(lines: readonly StockLine[]): Promise<void> {
  for (const line of lines) {
    try {
      await Product.updateOne(
        { _id: line.productId, variants: { $elemMatch: { size: line.size, color: line.color } } },
        { $inc: { "variants.$.stock": line.quantity } },
      );
    } catch (error) {
      console.error(
        `[orders] failed to restock ${line.productId} (${line.size}/${line.color}) x${line.quantity}:`,
        error,
      );
    }
  }
}

const itemsToStockLines = (items: readonly OrderItem[]): StockLine[] =>
  items.map((item) => ({
    productId: item.product.toString(),
    size: item.size,
    color: item.color,
    quantity: item.quantity,
  }));

/**
 * Places an order for `userId`.
 *
 *  1. The cart is re-priced from the database (client prices are never trusted).
 *  2. Stock is reserved line by line with an atomic conditional `$inc`, so two shoppers can
 *     never buy the last item. (MongoDB transactions need a replica set; this works on a
 *     standalone server and compensates by releasing reserved stock if anything fails.)
 *  3. The order is stored with a snapshot of names and prices.
 */
export async function createOrder(userId: string, input: CreateOrderInput): Promise<OrderDTO> {
  const quote = await quoteCart(input.lines);
  if (quote.lines.length === 0) throw new ApiError(400, "Your cart is empty");
  if (quote.hasIssues) {
    throw new ApiError(409, "Some items in your cart changed. Please review your cart.", { quote });
  }

  const reserved: StockLine[] = [];
  try {
    for (const line of quote.lines) {
      const result = await Product.updateOne(
        {
          _id: line.productId,
          isActive: true,
          variants: {
            $elemMatch: { size: line.size, color: line.color, stock: { $gte: line.quantity } },
          },
        },
        { $inc: { "variants.$.stock": -line.quantity } },
      );
      if (result.modifiedCount !== 1) {
        throw new ApiError(
          409,
          `Sorry, ${line.name} (${line.size}, ${line.color}) just sold out. Please review your cart.`,
        );
      }
      reserved.push({
        productId: line.productId,
        size: line.size,
        color: line.color,
        quantity: line.quantity,
      });
    }

    const now = new Date();
    const document: Omit<OrderAttrs, "orderNumber" | "createdAt" | "updatedAt"> = {
      user: new Types.ObjectId(userId),
      items: quote.lines.map((line) => ({
        product: new Types.ObjectId(line.productId),
        slug: line.slug,
        name: line.name,
        category: line.category,
        image: line.image,
        size: line.size,
        color: line.color,
        colorHex: line.colorHex,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
      })),
      shippingAddress: input.shippingAddress,
      paymentMethod: input.paymentMethod,
      status: "pending",
      statusHistory: [{ status: "pending", at: now }],
      notes: input.notes,
      subtotal: quote.subtotal,
      shipping: quote.shipping,
      total: quote.total,
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const created = await Order.create({ ...document, orderNumber: generateOrderNumber() });
        return toOrderDTO(created.toObject() as OrderRecord);
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
    }
    throw new Error("Could not allocate a unique order number");
  } catch (error) {
    await releaseStock(reserved);
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

const pageInfo = (total: number, page: number, pageSize: number) => ({
  total,
  page,
  pageSize,
  pageCount: Math.max(1, Math.ceil(total / pageSize)),
});

export async function listOrdersForUser(
  userId: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<OrderListDTO> {
  await connectDB();
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 10;
  const query: QueryFilter<OrderAttrs> = { user: userId };
  const [total, records] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);
  return { items: records.map((record) => toOrderDTO(record)), ...pageInfo(total, page, pageSize) };
}

/** A customer can only ever read their own orders. */
export async function getOrderForUser(userId: string, orderId: string): Promise<OrderDTO | null> {
  if (!OBJECT_ID.test(orderId)) return null;
  await connectDB();
  const record = await Order.findOne({ _id: orderId, user: userId }).lean();
  return record ? toOrderDTO(record) : null;
}

async function loadCustomers(records: readonly OrderRecord[]) {
  const ids = [...new Set(records.map((record) => record.user.toString()))];
  const users = await User.find({ _id: { $in: ids } }, "name email").lean();
  return new Map(
    users.map((user) => [
      user._id.toString(),
      { id: user._id.toString(), name: user.name, email: user.email },
    ]),
  );
}

export async function listOrdersForAdmin(options: {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
}): Promise<OrderListDTO> {
  await connectDB();
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const query: QueryFilter<OrderAttrs> = options.status ? { status: options.status } : {};
  const [total, records] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);
  const customers = await loadCustomers(records);
  return {
    items: records.map((record) => toOrderDTO(record, customers.get(record.user.toString()) ?? null)),
    ...pageInfo(total, page, pageSize),
  };
}

export async function getOrderForAdmin(orderId: string): Promise<OrderDTO | null> {
  if (!OBJECT_ID.test(orderId)) return null;
  await connectDB();
  const record = await Order.findById(orderId).lean();
  if (!record) return null;
  const customers = await loadCustomers([record]);
  return toOrderDTO(record, customers.get(record.user.toString()) ?? null);
}

/* -------------------------------------------------------------------------- */
/* Status changes                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Moves an order to `next`, but only if it is still in `from` (compare-and-set), so two
 * people acting at once cannot both succeed. Returns `null` when the order was not in `from`.
 */
async function transition(
  filter: QueryFilter<OrderAttrs>,
  from: readonly OrderStatus[],
  next: OrderStatus,
): Promise<OrderRecord | null> {
  return Order.findOneAndUpdate(
    { ...filter, status: { $in: from } },
    { $set: { status: next }, $push: { statusHistory: { status: next, at: new Date() } } },
    { returnDocument: "after" },
  ).lean();
}

/**
 * Cancels an order and returns its items to stock exactly once. Customers can cancel their
 * own orders while they are still pending; admins can cancel until the order is delivered.
 */
export async function cancelOrder(
  orderId: string,
  actor: { id: string; role: "customer" | "admin" },
): Promise<OrderDTO> {
  if (!OBJECT_ID.test(orderId)) throw new ApiError(404, "Order not found");
  await connectDB();

  const isAdmin = actor.role === "admin";
  const cancellableFrom: OrderStatus[] = isAdmin ? ["pending", "confirmed", "shipped"] : ["pending"];
  const ownership: QueryFilter<OrderAttrs> = isAdmin
    ? { _id: orderId }
    : { _id: orderId, user: actor.id };

  const cancelled = await transition(ownership, cancellableFrom, "cancelled");
  if (!cancelled) {
    const existing = await Order.findOne(ownership, "status").lean();
    if (!existing) throw new ApiError(404, "Order not found");
    throw new ApiError(
      409,
      existing.status === "cancelled"
        ? "This order is already cancelled"
        : isAdmin
          ? `A ${existing.status} order cannot be cancelled`
          : "This order can no longer be cancelled online. Please contact us.",
    );
  }

  await releaseStock(itemsToStockLines(cancelled.items));
  return toOrderDTO(cancelled);
}

/** Admin: advance an order through its lifecycle (`pending → confirmed → shipped → delivered`). */
export async function updateOrderStatus(orderId: string, next: OrderStatus): Promise<OrderDTO> {
  if (!OBJECT_ID.test(orderId)) throw new ApiError(404, "Order not found");
  await connectDB();

  const current = await Order.findById(orderId, "status").lean();
  if (!current) throw new ApiError(404, "Order not found");
  if (!ORDER_STATUS_TRANSITIONS[current.status].includes(next)) {
    throw new ApiError(409, `An order that is ${current.status} cannot be marked ${next}`);
  }

  if (next === "cancelled") return cancelOrder(orderId, { id: "admin", role: "admin" });

  const updated = await transition({ _id: orderId }, [current.status], next);
  if (!updated) throw new ApiError(409, "This order was just changed by someone else. Reload and retry.");
  return toOrderDTO(updated);
}

export type OrderStats = { orders: number; pendingOrders: number; revenue: number };

/** Cancelled orders do not count towards revenue. */
export async function getOrderStats(): Promise<OrderStats> {
  await connectDB();
  const [orders, pendingOrders, revenue] = await Promise.all([
    Order.countDocuments({}),
    Order.countDocuments({ status: "pending" }),
    Order.aggregate<{ total: number }>([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
  ]);
  return { orders, pendingOrders, revenue: revenue[0]?.total ?? 0 };
}
