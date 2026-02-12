"use client";

import { ReactNode } from "react";
import { motion } from "motion/react";

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  suggestion?: string;
}

export function EmptyState({ icon, message, suggestion }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-16"
    >
      {icon ? (
        <div className="mb-4 text-carbon-500">{icon}</div>
      ) : (
        <div className="mb-4">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            className="text-carbon-600"
          >
            <path
              d="M3 3v18h18"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7 16l4-4 4 4 5-6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      <p className="text-sm text-carbon-400 mb-1">{message}</p>
      {suggestion && (
        <p className="text-xs text-carbon-500">{suggestion}</p>
      )}
    </motion.div>
  );
}
