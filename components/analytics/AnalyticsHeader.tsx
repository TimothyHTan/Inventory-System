"use client";

import { timeAgo } from "@/lib/utils";
import { DateRangeSelect, DateRange } from "./DateRangeSelect";

interface AnalyticsHeaderProps {
  title: string;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  lastUpdated: number | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function AnalyticsHeader({
  title,
  dateRange,
  onDateRangeChange,
  lastUpdated,
  isRefreshing,
  onRefresh,
}: AnalyticsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <div className="stencil mb-1">Analitik</div>
        <h1 className="font-display text-2xl text-carbon-50">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="text-[10px] text-carbon-500 whitespace-nowrap hidden sm:block">
            Diperbarui: {timeAgo(lastUpdated)}
          </span>
        )}

        <DateRangeSelect value={dateRange} onChange={onDateRangeChange} />

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-sm text-carbon-400 hover:text-copper hover:bg-copper/8 transition-colors disabled:opacity-40 cursor-pointer"
          title="Perbarui data"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className={isRefreshing ? "animate-spin" : ""}
          >
            <path
              d="M21 12a9 9 0 11-2.64-6.36"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M21 3v6h-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
