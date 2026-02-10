"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { formatNumber, timeAgo } from "@/lib/utils";
import { Doc } from "@/convex/_generated/dataModel";

interface ProductCardProps {
  product: Doc<"products">;
  index?: number;
  orgSlug?: string;
  deleteMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function ProductCard({
  product,
  index = 0,
  orgSlug,
  deleteMode = false,
  isSelected = false,
  onToggleSelect
}: ProductCardProps) {
  const stockLevel =
    product.currentStock === 0
      ? "empty"
      : product.currentStock < 100
        ? "low"
        : "normal";

  const href = orgSlug
    ? `/org/${orgSlug}/products/${product._id}`
    : `/products/${product._id}`;

  const handleClick = (e: React.MouseEvent) => {
    if (deleteMode && onToggleSelect) {
      e.preventDefault();
      onToggleSelect(product._id);
    }
  };

  const CardContent = (
    <div
      className={`card group relative overflow-hidden p-4 min-h-[120px] flex flex-col ${
        deleteMode ? 'cursor-pointer' : 'card-hover'
      } ${isSelected ? 'ring-2 ring-copper' : ''}`}
      onClick={handleClick}
    >
      {/* Checkbox for delete mode */}
      <AnimatePresence>
        {deleteMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-3 right-3 z-10"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-copper border-copper'
                : 'bg-carbon-800 border-carbon-600'
            }`}>
              {isSelected && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l2.5 2.5L10 3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-carbon-900"
                  />
                </svg>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-copper/40 group-hover:bg-copper transition-colors" />

      <div className="flex items-start justify-between gap-3 flex-1">
        {/* Product info */}
        <div className="min-w-0 flex-1 flex flex-col">
          <h3 className="text-sm font-medium text-carbon-50 truncate group-hover:text-copper transition-colors">
            {product.name}
          </h3>
          <p className="text-xs text-carbon-400 mt-0.5 truncate min-h-[18px]">
            {product.description || "\u00A0"}
          </p>
          <p className="text-[10px] text-carbon-500 mt-auto pt-2 font-mono">
            {timeAgo(product.updatedAt)}
          </p>
        </div>

        {/* Stock count */}
        <motion.div
          className="text-right flex-shrink-0"
          animate={{
            y: deleteMode ? 16 : 0
          }}
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1]
          }}
        >
          <div
            className={`mono-num text-lg font-semibold ${
              stockLevel === "empty"
                ? "text-rust"
                : stockLevel === "low"
                  ? "text-copper"
                  : "text-carbon-50"
            }`}
          >
            {formatNumber(product.currentStock)}
          </div>
          <div className="stencil mt-0.5" style={{ fontSize: "9px" }}>
            Sisa
          </div>
        </motion.div>
      </div>

      {/* Bottom rule — thin dashed line like a ledger card */}
      <div className="mt-3 border-t border-dashed border-carbon-700/40" />

      {/* Hover arrow indicator (hide in delete mode) */}
      {!deleteMode && (
        <div className="absolute right-3 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-copper"
          >
            <path
              d="M2 6h8m0 0L7 3m3 3L7 9"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {deleteMode ? CardContent : <Link href={href}>{CardContent}</Link>}
    </motion.div>
  );
}
