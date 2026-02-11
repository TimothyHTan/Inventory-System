"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization, ROLE_LABELS } from "@/components/OrganizationProvider";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

const roleBadgeVariant: Record<string, "copper" | "sage" | "rust" | "muted"> = {
  employee: "muted",
  logistic: "sage",
  manager: "copper",
  owner: "copper",
  admin: "rust",
};

export function OrgSwitcher() {
  const { org, membership, isManager } = useOrganization();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!org) return null;

  // If not manager, no dropdown needed — just show org name
  if (!isManager) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <div className="w-4 h-4 relative flex-shrink-0">
          <div className="absolute inset-0 border border-copper/50 rounded-[2px]" />
          <div className="absolute top-0.5 left-0.5 right-0.5 bottom-0.5 bg-copper/15 rounded-[1px]" />
        </div>
        <span className="text-xs text-carbon-100 font-medium max-w-[120px] truncate">
          {org.name}
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-all duration-150",
          "hover:bg-carbon-800/80 border border-transparent",
          open && "bg-carbon-800/80 border-carbon-600/40"
        )}
      >
        {/* Org icon — layered squares */}
        <div className="w-4 h-4 relative flex-shrink-0">
          <div className="absolute inset-0 border border-copper/50 rounded-[2px]" />
          <div className="absolute top-0.5 left-0.5 right-0.5 bottom-0.5 bg-copper/15 rounded-[1px]" />
        </div>

        <span className="text-xs text-carbon-100 font-medium max-w-[120px] truncate">
          {org.name}
        </span>

        {/* Chevron */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={cn(
            "text-carbon-400 transition-transform duration-150",
            open && "rotate-180"
          )}
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute top-full left-0 mt-1.5 w-64 bg-carbon-800 border border-carbon-600/40 rounded-sm shadow-elevated z-50 overflow-hidden"
          >
            {/* Org info */}
            <div className="px-3 py-3 border-b border-carbon-700/50">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-carbon-500 font-medium mb-1">
                    Organisasi
                  </p>
                  <p className="text-xs text-carbon-100 font-medium truncate">
                    {org.name}
                  </p>
                </div>
                {membership && (
                  <Badge
                    variant={roleBadgeVariant[membership.role] || "muted"}
                    className="flex-shrink-0"
                  >
                    {ROLE_LABELS[membership.role] || membership.role}
                  </Badge>
                )}
              </div>
            </div>

            {/* Org settings */}
            <div className="py-1">
              <button
                onClick={() => {
                  router.push(`/org/${org.slug}/settings`);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-carbon-300 hover:text-carbon-50 hover:bg-carbon-700/50 transition-colors"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M6 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <path
                    d="M9.7 7.5l-.3.5.5.9-.7.7-.9-.5-.5.3-.2 1h-1l-.2-1-.5-.3-.9.5-.7-.7.5-.9-.3-.5-1-.2v-1l1-.2.3-.5-.5-.9.7-.7.9.5.5-.3.2-1h1l.2 1 .5.3.9-.5.7.7-.5.9.3.5 1 .2v1l-1 .2z"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
                Pengaturan Organisasi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
