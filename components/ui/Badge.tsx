"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type BadgeVariant = "default" | "copper" | "sage" | "rust" | "muted";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-carbon-700 text-carbon-200 border-carbon-600/40",
  copper: "bg-copper/10 text-copper border-copper/20",
  sage: "bg-sage/10 text-sage border-sage/20",
  rust: "bg-rust/10 text-rust border-rust/20",
  muted: "bg-carbon-800 text-carbon-300 border-carbon-700/40",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium border rounded-sm",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
