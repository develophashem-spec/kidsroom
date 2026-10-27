"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { FitFinder } from "@/components/fit-finder";
import { CheckIcon } from "@/components/icons";
import { ProductImage } from "@/components/product-image";
import { Button, ButtonLink } from "@/components/ui";
import { cartLimits } from "@/config/site";
import { isFitCategory, sizesFor } from "@/lib/catalog-constants";
import { cart } from "@/lib/cart-store";
import type { ProductDTO } from "@/lib/types";

const LOW_STOCK = 3;

type Props = {
  product: ProductDTO;
  /** Server-rendered heading block (breadcrumb, name, price, blurb). */
  intro: ReactNode;
  /** Server-rendered extras (details, size guide). */
  extras: ReactNode;
};

export function ProductView({ product, intro, extras }: Props) {
  const stockOf = (size: string, color: string) =>
    product.variants.find((variant) => variant.size === size && variant.color === color)?.stock ?? 0;

  const order = sizesFor(product.department, product.category);
  const sizes = [...new Set(product.variants.map((variant) => variant.size))].sort((a, b) => {
    const left = order.indexOf(a);
    const right = order.indexOf(b);
    return (left === -1 ? order.length : left) - (right === -1 ? order.length : right);
  });

  const firstAvailableColor =
    product.colors.find((candidate) =>
      product.variants.some((variant) => variant.color === candidate.name && variant.stock > 0),
    ) ?? product.colors[0];

  const [colorName, setColorName] = useState(firstAvailableColor?.name ?? "");
  const [sizeChoice, setSizeChoice] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [sizeError, setSizeError] = useState(false);
  const [added, setAdded] = useState<{ size: string; color: string; quantity: number } | null>(null);

  const color = product.colors.find((candidate) => candidate.name === colorName) ?? product.colors[0];
  // A size that is sold out in the chosen colour can't stay selected.
  const size = sizeChoice && color && stockOf(sizeChoice, color.name) > 0 ? sizeChoice : null;
  const stock = size && color ? stockOf(size, color.name) : 0;
  const maxQuantity = size ? Math.max(1, Math.min(cartLimits.maxQuantityPerLine, stock)) : cartLimits.maxQuantityPerLine;
  const quantityShown = Math.min(quantity, maxQuantity);
  const image = product.images[Math.min(imageIndex, product.images.length - 1)] ?? null;

  function chooseSize(next: string) {
    setSizeChoice(next);
    setSizeError(false);
    setAdded(null);
  }

  function addToCart() {
    if (!size || !color) {
      setSizeError(true);
      return;
    }
    cart.add({ productId: product.id, size, color: color.name, quantity: quantityShown });
    setAdded({ size, color: color.name, quantity: quantityShown });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-line">
          <ProductImage
            category={product.category}
            name={product.name}
            colorHex={color?.hex}
            image={image}
            priority
          />
        </div>
        {product.images.length > 1 ? (
          <ul className="mt-3 flex gap-2">
            {product.images.map((url, index) => (
              <li key={url}>
                <button
                  type="button"
                  onClick={() => setImageIndex(index)}
                  aria-label={`Show photo ${index + 1}`}
                  aria-current={index === imageIndex}
                  className={`block h-20 w-16 overflow-hidden rounded-lg border-2 ${
                    index === imageIndex ? "border-ink" : "border-transparent"
                  }`}
                >
                  <ProductImage
                    category={product.category}
                    name={`${product.name} – photo ${index + 1}`}
                    image={url}
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        {intro}

        <div className="mt-8 space-y-7">
          {product.colors.length > 0 ? (
            <fieldset>
              <legend className="mb-2 text-sm">
                <span className="font-semibold">Colour:</span> <span className="text-muted">{color?.name}</span>
              </legend>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((option) => {
                  const available = product.variants.some(
                    (variant) => variant.color === option.name && variant.stock > 0,
                  );
                  return (
                    <label key={option.name} className="cursor-pointer">
                      <input
                        type="radio"
                        name="color"
                        value={option.name}
                        checked={option.name === color?.name}
                        onChange={() => {
                          setColorName(option.name);
                          setAdded(null);
                        }}
                        className="peer sr-only"
                      />
                      <span className="sr-only">
                        {option.name}
                        {available ? "" : " (sold out)"}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`block h-9 w-9 rounded-full border border-ink/20 ring-offset-2 ring-offset-paper transition peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${
                          available ? "" : "opacity-40"
                        }`}
                        style={{ backgroundColor: option.hex }}
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <fieldset aria-describedby={sizeError ? "size-error" : undefined}>
            <legend className="mb-2 flex w-full items-baseline justify-between text-sm">
              <span className="font-semibold">Size{size ? <span className="font-normal text-muted">: {size}</span> : null}</span>
              <a
                href="#size-guide"
                className="text-xs font-medium underline underline-offset-4 hover:text-accent"
                onClick={() => document.getElementById("size-guide")?.setAttribute("open", "")}
              >
                Size guide
              </a>
            </legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((option) => {
                const available = color ? stockOf(option, color.name) > 0 : false;
                return (
                  <label key={option} className={available ? "cursor-pointer" : "cursor-not-allowed"}>
                    <input
                      type="radio"
                      name="size"
                      value={option}
                      disabled={!available}
                      checked={size === option}
                      onChange={() => chooseSize(option)}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex h-11 min-w-12 items-center justify-center rounded-full border px-3.5 text-sm font-medium transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
                        available
                          ? "border-line bg-card peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper hover:border-ink"
                          : "border-line bg-line/40 text-muted line-through"
                      }`}
                    >
                      {option}
                      {available ? null : <span className="sr-only"> (sold out)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            {sizeError ? (
              <p id="size-error" role="alert" className="mt-2 text-sm font-medium text-sale">
                Please choose a size first.
              </p>
            ) : null}
            {size && stock > 0 && stock <= LOW_STOCK ? (
              <p className="mt-2 text-sm font-medium text-sale">
                Only {stock} left in {size} / {color?.name}.
              </p>
            ) : null}
          </fieldset>

          {isFitCategory(product.category) && product.inStock ? (
            <FitFinder
              mode="inline"
              department={product.department}
              productFit={product.fit}
              selectedSize={size}
              isSizeAvailable={(candidate) => (color ? stockOf(candidate, color.name) > 0 : false)}
              onSelectSize={chooseSize}
            />
          ) : null}

          {product.inStock ? (
            <div className="flex flex-wrap items-center gap-4">
              <div role="group" aria-label="Quantity" className="inline-flex items-center rounded-full border border-line bg-card">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantityShown <= 1}
                  onClick={() => setQuantity(Math.max(1, quantityShown - 1))}
                  className="h-11 w-11 rounded-full text-lg hover:bg-line/70 disabled:opacity-40"
                >
                  −
                </button>
                <output aria-live="polite" className="w-8 text-center text-sm font-semibold">
                  {quantityShown}
                </output>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={quantityShown >= maxQuantity}
                  onClick={() => {
                    setQuantity(Math.min(maxQuantity, quantityShown + 1));
                    setAdded(null);
                  }}
                  className="h-11 w-11 rounded-full text-lg hover:bg-line/70 disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <Button size="lg" className="min-w-52 flex-1 sm:flex-none" onClick={addToCart}>
                Add to bag
              </Button>
            </div>
          ) : (
            <Button size="lg" disabled className="w-full sm:w-auto">
              Sold out
            </Button>
          )}

          {added ? (
            <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <span className="inline-flex items-center gap-2 font-medium">
                <CheckIcon width={18} height={18} />
                Added {added.quantity} × {product.name} ({added.size}, {added.color}) to your bag.
              </span>
              <span className="flex gap-2">
                <ButtonLink href="/cart" size="sm" variant="secondary">
                  View bag
                </ButtonLink>
                <ButtonLink href="/checkout" size="sm">
                  Checkout
                </ButtonLink>
              </span>
            </div>
          ) : null}

          <p className="text-xs text-muted">
            Pay when your order arrives.{" "}
            <Link href="/help" className="underline underline-offset-2">
              Shipping &amp; help
            </Link>
          </p>
        </div>

        {extras}
      </div>
    </div>
  );
}
