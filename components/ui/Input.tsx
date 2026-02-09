"use client";

import { cn } from "@/lib/utils";
import { forwardRef, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs uppercase tracking-wider text-carbon-300 font-medium"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full bg-carbon-800 border border-carbon-600/40 rounded-sm px-3 py-2 text-sm text-carbon-50",
            "placeholder:text-carbon-400",
            "focus:outline-none focus:border-copper/50 focus:ring-1 focus:ring-copper/20",
            "transition-colors duration-150",
            error && "border-rust/50 focus:border-rust/50 focus:ring-rust/20",
            props.type === "number" && "font-mono tabular-nums",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-rust">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
