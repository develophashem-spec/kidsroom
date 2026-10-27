import { formatMoney } from "@/lib/money";

export function Price({
  price,
  compareAt,
  className = "",
}: {
  price: number;
  compareAt?: number | null;
  className?: string;
}) {
  const onSale = typeof compareAt === "number" && compareAt > price;
  return (
    <p className={className}>
      <span className={onSale ? "font-semibold text-sale" : "font-semibold"}>{formatMoney(price)}</span>
      {onSale ? (
        <>
          <span className="sr-only"> (was {formatMoney(compareAt)})</span>
          <s aria-hidden="true" className="ml-2 text-muted">
            {formatMoney(compareAt)}
          </s>
        </>
      ) : null}
    </p>
  );
}
