"use client";

import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Cari produk...",
  className,
}: SearchBarProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Search icon */}
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 text-carbon-400 pointer-events-none"
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
      >
        <path
          d="M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zM9.354 10.146l3.5 3.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full bg-carbon-800/60 border border-carbon-600/30 rounded-sm",
          "pl-9 pr-3 py-2 text-sm text-carbon-50",
          "placeholder:text-carbon-500",
          "focus:outline-none focus:border-copper/40 focus:ring-1 focus:ring-copper/15",
          "transition-colors duration-150"
        )}
      />

      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-200 transition-colors p-1"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 3l6 6M9 3l-6 6"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
