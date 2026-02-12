"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useConvex } from "convex/react";
import { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";

/**
 * Non-reactive analytics query hook.
 *
 * Unlike `useQuery`, this does NOT maintain a Convex subscription.
 * It fetches once on mount, caches the result in React state,
 * polls at a configurable interval, and exposes a manual refresh.
 */
export function useAnalyticsQuery<
  F extends FunctionReference<"query">,
>(
  queryRef: F,
  args: FunctionArgs<F> | "skip",
  options: { pollInterval?: number } = {}
): {
  data: FunctionReturnType<F> | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
  error: string | null;
} {
  const convex = useConvex();
  const { pollInterval = 5 * 60 * 1000 } = options; // default 5 min

  const [data, setData] = useState<FunctionReturnType<F> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track args serialization to detect changes
  const argsKey = args === "skip" ? "skip" : JSON.stringify(args);
  const argsRef = useRef(argsKey);

  const fetchData = useCallback(
    async (isManual = false) => {
      if (args === "skip") return;

      if (isManual) setIsRefreshing(true);
      else if (!data) setIsLoading(true);

      try {
        const result = await (convex as any).query(queryRef, args);
        setData(result);
        setLastUpdated(Date.now());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [convex, queryRef, argsKey]
  );

  // Reset and refetch when args change
  useEffect(() => {
    if (argsRef.current !== argsKey) {
      argsRef.current = argsKey;
      setData(undefined);
      setIsLoading(true);
    }
    if (argsKey !== "skip") {
      fetchData();
    }
  }, [argsKey, fetchData]);

  // Polling interval
  useEffect(() => {
    if (argsKey === "skip" || pollInterval <= 0) return;
    const id = setInterval(() => fetchData(), pollInterval);
    return () => clearInterval(id);
  }, [fetchData, pollInterval, argsKey]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return { data, isLoading, isRefreshing, lastUpdated, refresh, error };
}
