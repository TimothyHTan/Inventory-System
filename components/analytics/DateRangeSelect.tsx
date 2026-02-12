"use client";

import { cn } from "@/lib/utils";

export type DateRange = "7d" | "30d" | "90d";

interface DateRangeSelectProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const options: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7 hari" },
  { value: "30d", label: "30 hari" },
  { value: "90d", label: "90 hari" },
];

export function DateRangeSelect({ value, onChange }: DateRangeSelectProps) {
  return (
    <div className="flex items-center gap-1 bg-carbon-800 border border-carbon-600/30 rounded-sm p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-all duration-150 cursor-pointer",
            value === opt.value
              ? "bg-copper/15 text-copper border border-copper/20"
              : "text-carbon-400 hover:text-carbon-200 border border-transparent"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Compute ISO start/end dates from a DateRange */
export function getDateRange(range: DateRange): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const end = new Date(now);
  const endDate = formatISODate(end);

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  const startDate = formatISODate(start);

  return { startDate, endDate };
}

function formatISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
