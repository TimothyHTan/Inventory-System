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
  options: { pollInterval?: number; timeoutMs?: number } = {}
): {
  data: FunctionReturnType<F> | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
  error: string | null;
} {
  const convex = useConvex();
  const { pollInterval = 5 * 60 * 1000, timeoutMs = 20_000 } = options; // default 5 min poll, 20s timeout

  const [data, setData] = useState<FunctionReturnType<F> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const hasDataRef = useRef(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchRef = useRef<(isManual?: boolean) => Promise<void>>(async () => {});
  const convexRef = useRef(convex);

  // Track args serialization to detect changes
  const argsKey = args === "skip" ? "skip" : JSON.stringify(args);
  const argsRef = useRef(argsKey);

  useEffect(() => {
    convexRef.current = convex;
  }, [convex]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    fetchRef.current = async (isManual = false) => {
      if (args === "skip") {
        if (mountedRef.current) {
          setIsRefreshing(false);
        }
        return;
      }
      if (inFlightRef.current) return;

      if (isManual) setIsRefreshing(true);
      else if (!hasDataRef.current) setIsLoading(true);

      inFlightRef.current = true;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      watchdogRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        inFlightRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
        setError((prev) => prev ?? "Permintaan data analytics timeout. Coba refresh.");
      }, timeoutMs + 1000);
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        const queryPromise = (convexRef.current as any).query(queryRef, args);
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("Permintaan data analytics timeout. Coba refresh."));
          }, timeoutMs);
        });

        const result = await Promise.race([queryPromise, timeoutPromise]);
        if (!mountedRef.current) return;

        setData(result);
        hasDataRef.current = result !== null && result !== undefined;
        setLastUpdated(Date.now());
        setError(null);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : "Gagal memuat data");
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (watchdogRef.current) {
          clearTimeout(watchdogRef.current);
          watchdogRef.current = null;
        }
        inFlightRef.current = false;
        if (!mountedRef.current) return;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };
  }, [argsKey, queryRef, timeoutMs, args]);

  // Reset and refetch when args change
  useEffect(() => {
    if (argsRef.current !== argsKey) {
      argsRef.current = argsKey;
      hasDataRef.current = false;
      setData(undefined);
      setIsLoading(true);
    }
    if (argsKey === "skip") {
      setIsRefreshing(false);
      return;
    }
    void fetchRef.current();
  }, [argsKey]);

  // Polling interval
  useEffect(() => {
    if (argsKey === "skip" || pollInterval <= 0) return;
    const id = setInterval(() => {
      void fetchRef.current();
    }, pollInterval);
    return () => clearInterval(id);
  }, [pollInterval, argsKey]);

  const refresh = useCallback(async () => {
    await fetchRef.current(true);
  }, []);

  return { data, isLoading, isRefreshing, lastUpdated, refresh, error };
}
