import { cartLimits } from "@/config/site";

/** What the browser keeps for each cart line. Prices are never stored client-side. */
export type CartLine = {
  productId: string;
  size: string;
  color: string;
  quantity: number;
};

const OBJECT_ID = /^[a-f\d]{24}$/i;

export const lineKey = (line: Pick<CartLine, "productId" | "size" | "color">): string =>
  `${line.productId}|${line.size}|${line.color}`;

/** Combines lines for the same product / size / colour, keeping first-seen order. */
export function mergeLines(lines: readonly CartLine[]): CartLine[] {
  const merged = new Map<string, CartLine>();
  for (const line of lines) {
    const key = lineKey(line);
    const existing = merged.get(key);
    if (existing) existing.quantity += line.quantity;
    else merged.set(key, { ...line });
  }
  return [...merged.values()];
}

const clampQuantity = (quantity: number) =>
  Math.min(cartLimits.maxQuantityPerLine, Math.max(1, Math.floor(quantity)));

export function addLine(lines: readonly CartLine[], line: CartLine): CartLine[] {
  const key = lineKey(line);
  const next = lines.map((existing) => ({ ...existing }));
  const existing = next.find((candidate) => lineKey(candidate) === key);
  if (existing) {
    existing.quantity = clampQuantity(existing.quantity + line.quantity);
    return next;
  }
  if (next.length >= cartLimits.maxLines) return next;
  next.push({ ...line, quantity: clampQuantity(line.quantity) });
  return next;
}

export function setLineQuantity(lines: readonly CartLine[], key: string, quantity: number): CartLine[] {
  if (!Number.isFinite(quantity) || quantity < 1) return removeLine(lines, key);
  return lines.map((line) =>
    lineKey(line) === key ? { ...line, quantity: clampQuantity(quantity) } : { ...line },
  );
}

export function removeLine(lines: readonly CartLine[], key: string): CartLine[] {
  return lines.filter((line) => lineKey(line) !== key).map((line) => ({ ...line }));
}

export const cartCount = (lines: readonly CartLine[]): number =>
  lines.reduce((sum, line) => sum + line.quantity, 0);

/** Parses whatever is in localStorage defensively: bad data is dropped, never trusted. */
export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const lines: CartLine[] = [];
  for (const entry of data) {
    if (typeof entry !== "object" || entry === null) continue;
    const { productId, size, color, quantity } = entry as Record<string, unknown>;
    if (typeof productId !== "string" || !OBJECT_ID.test(productId)) continue;
    if (typeof size !== "string" || size.length === 0 || size.length > 20) continue;
    if (typeof color !== "string" || color.length === 0 || color.length > 40) continue;
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 1) continue;
    lines.push({ productId, size, color, quantity: clampQuantity(quantity) });
  }
  return mergeLines(lines)
    .map((line) => ({ ...line, quantity: clampQuantity(line.quantity) }))
    .slice(0, cartLimits.maxLines);
}
