import "server-only";
import { shippingConfig } from "@/config/site";
import type { OrderRecord, ProductRecord } from "@/models";
import type { OrderDTO, ProductDTO } from "@/lib/types";

export function toProductDTO(product: ProductRecord): ProductDTO {
  return {
    id: product._id.toString(),
    slug: product.slug,
    name: product.name,
    description: product.description ?? "",
    details: product.details ?? [],
    department: product.department,
    category: product.category,
    fit: product.fit,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? null,
    colors: (product.colors ?? []).map((color) => ({ name: color.name, hex: color.hex })),
    images: product.images ?? [],
    variants: (product.variants ?? []).map((variant) => ({
      size: variant.size,
      color: variant.color,
      stock: variant.stock,
    })),
    tags: product.tags ?? [],
    featured: Boolean(product.featured),
    isActive: Boolean(product.isActive),
    inStock: (product.variants ?? []).some((variant) => variant.stock > 0),
    createdAt: product.createdAt.toISOString(),
  };
}

export function toOrderDTO(
  order: OrderRecord,
  customer?: { id: string; name: string; email: string } | null,
): OrderDTO {
  const dto: OrderDTO = {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    items: order.items.map((item) => ({
      productId: item.product.toString(),
      slug: item.slug,
      name: item.name,
      category: item.category,
      image: item.image ?? null,
      size: item.size,
      color: item.color,
      colorHex: item.colorHex,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.unitPrice * item.quantity,
    })),
    shippingAddress: {
      fullName: order.shippingAddress.fullName,
      phone: order.shippingAddress.phone,
      line1: order.shippingAddress.line1,
      line2: order.shippingAddress.line2 ?? "",
      city: order.shippingAddress.city,
      region: order.shippingAddress.region ?? "",
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
    },
    notes: order.notes ?? "",
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    statusHistory: (order.statusHistory ?? []).map((change) => ({
      status: change.status,
      at: change.at.toISOString(),
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
  if (customer !== undefined) dto.customer = customer;
  return dto;
}

export const freeShippingThreshold = shippingConfig.freeThreshold;
