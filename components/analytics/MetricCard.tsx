"use client";

import { cn, formatNumber } from "@/lib/utils";
import { motion } from "motion/react";
import { ReactNode } from "react";

type MetricVariant = "default" | "success" | "danger" | "warning";

interface MetricCardProps {
  label: string;
  value: number;
  icon?: ReactNode;
  trend?: { value: number; label?: string };
  variant?: MetricVariant;
  index?: number;
}

const variantStyles: Record<MetricVariant, { value: string; icon: string }> = {
  default: { value: "text-carbon-50", icon: "text-carbon-400" },
  success: { value: "text-sage", icon: "text-sage" },
  danger: { value: "text-rust", icon: "text-rust" },
  warning: { value: "text-copper", icon: "text-copper" },
};

export function MetricCard({
  label,
  value,
  icon,
  trend,
  variant = "default",
  index = 0,
}: MetricCardProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="card px-4 py-4 group hover:border-copper/20 transition-colors duration-200"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="stencil" style={{ fontSize: "9px" }}>
          {label}
        </div>
        {icon && (
          <div className={cn("opacity-60", styles.icon)}>{icon}</div>
        )}
      </div>
      <div className={cn("mono-num text-2xl font-semibold", styles.value)}>
        {formatNumber(value)}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-1.5">
          <span
            className={cn(
              "text-[10px] font-medium mono-num",
              trend.value >= 0 ? "text-sage" : "text-rust"
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {formatNumber(trend.value)}
          </span>
          {trend.label && (
            <span className="text-[10px] text-carbon-500">{trend.label}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="card px-4 py-4 animate-pulse">
      <div className="h-2.5 bg-carbon-700 rounded w-16 mb-3" />
      <div className="h-7 bg-carbon-700 rounded w-20" />
    </div>
  );
}
