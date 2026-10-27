"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/client-api";
import type { CartLine } from "@/lib/cart-utils";
import type { QuoteDTO } from "@/lib/types";

type QuoteResult = { key: string; attempt: number; quote: QuoteDTO | null; error: string | null };

export type QuoteState = {
  /** Latest quote – kept on screen while a newer one is loading. */
  quote: QuoteDTO | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

/**
 * Prices the bag on the server (`POST /api/cart/quote`) every time its contents change, so
 * totals and availability shown to the shopper always come from the database.
 */
export function useQuote(lines: readonly CartLine[]): QuoteState {
  const key = JSON.stringify(lines);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<QuoteResult | null>(null);

  useEffect(() => {
    if (lines.length === 0) return;
    const controller = new AbortController();
    (async () => {
      const response = await apiRequest<{ quote: QuoteDTO }>("/api/cart/quote", {
        body: { lines },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setResult(
        response.ok
          ? { key, attempt, quote: response.data.quote, error: null }
          : { key, attempt, quote: null, error: response.error.message },
      );
    })();
    return () => controller.abort();
  }, [lines, key, attempt]);

  if (lines.length === 0) {
    return { quote: null, error: null, loading: false, refresh: () => {} };
  }

  const current = result !== null && result.key === key && result.attempt === attempt;
  return {
    quote: result?.quote ?? null,
    error: current ? result.error : null,
    loading: !current,
    refresh: () => setAttempt((value) => value + 1),
  };
}
