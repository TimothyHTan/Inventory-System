"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { formatNumber, timeAgo } from "@/lib/utils";
import { Doc } from "@/convex/_generated/dataModel";

interface ProductCardProps {
  product: Doc<"products">;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const stockLevel =
    product.currentStock === 0
      ? "empty"
      : product.currentStock < 100
        ? "low"
        : "normal";

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
      <Link href={`/products/${product._id}`}>
        <div className="card card-hover group relative overflow-hidden p-4">
          {/* Left accent stripe */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-copper/40 group-hover:bg-copper transition-colors" />

          <div className="flex items-start justify-between gap-3">
            {/* Product info */}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-carbon-50 truncate group-hover:text-copper transition-colors">
                {product.name}
              </h3>
              {product.description && (
                <p className="text-xs text-carbon-400 mt-0.5 truncate">
                  {product.description}
                </p>
              )}
              <p className="text-[10px] text-carbon-500 mt-2 font-mono">
                {timeAgo(product.updatedAt)}
              </p>
            </div>

            {/* Stock count */}
            <div className="text-right flex-shrink-0">
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
            </div>
          </div>

          {/* Bottom rule — thin dashed line like a ledger card */}
          <div className="mt-3 border-t border-dashed border-carbon-700/40" />

          {/* Hover arrow indicator */}
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
        </div>
      </Link>
    </motion.div>
  );
}
