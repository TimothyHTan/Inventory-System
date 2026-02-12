"use client";

import { ReactNode } from "react";
import { motion } from "motion/react";

interface ChartContainerProps {
  title: string;
  children: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  className?: string;
}

export function ChartContainer({
  title,
  children,
  isLoading = false,
  isEmpty = false,
  className,
}: ChartContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`card p-5 ${className ?? ""}`}
    >
      <div className="stencil mb-4" style={{ fontSize: "9px" }}>
        {title}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-carbon-400">
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-xs">Memuat data...</span>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-xs text-carbon-500">
            Belum ada data dalam periode ini
          </p>
        </div>
      ) : (
        children
      )}
    </motion.div>
  );
}
