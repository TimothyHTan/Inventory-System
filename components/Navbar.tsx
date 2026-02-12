"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import {
  useOrganization,
  ROLE_LABELS,
} from "@/components/OrganizationProvider";
import {
  HamburgerMenu,
  MobileMenuDropdown,
} from "@/components/ui/HamburgerMenu";
import { motion, AnimatePresence } from "motion/react";

// Badge variant per role
const roleBadgeVariant: Record<string, "copper" | "sage" | "rust" | "muted"> = {
  employee: "muted",
  logistic: "sage",
  manager: "copper",
  owner: "copper",
  admin: "rust",
};

export function Navbar() {
  const pathname = usePathname();
  const user = useQuery(api.users.current);
  const { signOut } = useAuthActions();
  const { org, membership, isLogistic, isManager } = useOrganization();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [mobileAnalyticsOpen, setMobileAnalyticsOpen] = useState(false);

  const orgSlug = org?.slug;
  const dashboardHref = orgSlug ? `/org/${orgSlug}/dashboard` : "/dashboard";
  const requestsHref = orgSlug ? `/org/${orgSlug}/requests` : "#";
  const inboundHref = orgSlug ? `/org/${orgSlug}/inbound` : "#";
  const accountHref = orgSlug ? `/org/${orgSlug}/account` : "#";
  const analyticsHref = orgSlug ? `/org/${orgSlug}/analytics/ringkasan` : "#";
  const isOnAnalytics = pathname.includes("/analytics");

  // Pending request count for notification badge (logistic+ only)
  const pendingCount = useQuery(
    api.stockRequests.pendingCount,
    org && isLogistic ? { organizationId: org._id } : "skip"
  );

  return (
    <nav className="sticky top-0 z-30 bg-carbon-900/90 backdrop-blur-md border-b border-carbon-700/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left — Logo + Org Switcher */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link href={dashboardHref} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rotate-45 border-2 border-copper flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-copper" />
              </div>
              <span className="font-display text-lg text-carbon-50 hidden sm:block">
                StockCard
              </span>
            </Link>

            {org && (
              <>
                <div className="h-4 w-px bg-carbon-700/60 hidden md:block" />
                <OrgSwitcher />
              </>
            )}
          </div>

          {/* Center — Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink
              href={dashboardHref}
              active={pathname.endsWith("/dashboard")}
            >
              Dashboard
            </NavLink>
            {isManager && (
              <AnalyticsDropdown
                orgSlug={orgSlug}
                isActive={isOnAnalytics}
                isOpen={analyticsOpen}
                onToggle={setAnalyticsOpen}
                pathname={pathname}
              />
            )}
            <NavLink
              href={requestsHref}
              active={pathname.endsWith("/requests")}
              badge={isLogistic && pendingCount ? pendingCount : undefined}
            >
              Permintaan Stok
            </NavLink>
            {isLogistic && (
              <NavLink
                href={inboundHref}
                active={pathname.endsWith("/inbound")}
              >
                Barang Masuk
              </NavLink>
            )}
          </div>

          {/* Right — User info (desktop) / Hamburger (mobile) */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden md:flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-carbon-300 whitespace-nowrap">
                    {user.name || user.email}
                  </span>
                  {membership && (
                    <Badge
                      variant={
                        roleBadgeVariant[membership.role] || "muted"
                      }
                    >
                      {ROLE_LABELS[membership.role] || membership.role}
                    </Badge>
                  )}
                </div>
              )}

              <div className="h-4 w-px bg-carbon-700/60" />

              <Link
                href={accountHref}
                className={cn(
                  "p-1.5 rounded-sm transition-colors",
                  pathname.endsWith("/account")
                    ? "text-copper bg-copper/8"
                    : "text-carbon-400 hover:text-carbon-100 hover:bg-carbon-800/60"
                )}
                title="Pengaturan"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 8.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M11.3 8.5l-.3.6.5 1-.8.8-1-.5-.6.3-.2 1.1h-1.1l-.2-1.1-.6-.3-1 .5-.8-.8.5-1-.3-.6-1.1-.2V7.2l1.1-.2.3-.6-.5-1 .8-.8 1 .5.6-.3.2-1.1h1.1l.2 1.1.6.3 1-.5.8.8-.5 1 .3.6 1.1.2v1.1l-1.1.2z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
              </Link>

              <button
                onClick={() => void signOut()}
                className="text-xs text-carbon-400 hover:text-carbon-100 transition-colors px-2 py-1 whitespace-nowrap"
              >
                Keluar
              </button>
            </div>

            <div className="md:hidden">
              <HamburgerMenu
                isOpen={mobileMenuOpen}
                onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <MobileMenuDropdown isOpen={mobileMenuOpen}>
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
          <div className="space-y-2">
            <MobileNavLink
              href={dashboardHref}
              active={pathname.endsWith("/dashboard")}
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </MobileNavLink>
            {isManager && (
              <MobileAnalyticsAccordion
                orgSlug={orgSlug}
                isActive={isOnAnalytics}
                isOpen={mobileAnalyticsOpen}
                onToggle={() => setMobileAnalyticsOpen(!mobileAnalyticsOpen)}
                pathname={pathname}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            )}
            <MobileNavLink
              href={requestsHref}
              active={pathname.endsWith("/requests")}
              onClick={() => setMobileMenuOpen(false)}
              badge={isLogistic && pendingCount ? pendingCount : undefined}
            >
              Permintaan Stok
            </MobileNavLink>
            {isLogistic && (
              <MobileNavLink
                href={inboundHref}
                active={pathname.endsWith("/inbound")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Barang Masuk
              </MobileNavLink>
            )}
            <MobileNavLink
              href={accountHref}
              active={pathname.endsWith("/account")}
              onClick={() => setMobileMenuOpen(false)}
            >
              Pengaturan
            </MobileNavLink>
          </div>

          <div className="h-px bg-carbon-700/40" />

          {user && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-carbon-300">
                  {user.name || user.email}
                </span>
                {membership && (
                  <Badge
                    variant={roleBadgeVariant[membership.role] || "muted"}
                  >
                    {ROLE_LABELS[membership.role] || membership.role}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="h-px bg-carbon-700/40" />

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              void signOut();
            }}
            className="w-full text-left text-sm text-carbon-400 hover:text-carbon-100 transition-colors py-2"
          >
            Keluar
          </button>
        </div>
      </MobileMenuDropdown>

      <div className="h-px bg-gradient-to-r from-transparent via-copper/20 to-transparent" />
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
  badge,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative px-3 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors whitespace-nowrap",
        active
          ? "text-copper bg-copper/8"
          : "text-carbon-300 hover:text-carbon-50 hover:bg-carbon-800/60"
      )}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-rust text-[9px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function MobileNavLink({
  href,
  active,
  children,
  onClick,
  badge,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "relative block px-4 py-2.5 text-sm uppercase tracking-wider rounded-sm transition-colors",
        active
          ? "text-copper bg-copper/8"
          : "text-carbon-300 hover:text-carbon-50 hover:bg-carbon-800/60"
      )}
    >
      <span className="flex items-center gap-2">
        {children}
        {badge !== undefined && badge > 0 && (
          <span className="min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-rust text-[9px] font-bold text-white">
            {badge}
          </span>
        )}
      </span>
    </Link>
  );
}

// ── Analytics Dropdown (Desktop) ──────────────────────────────────
const analyticsSubPages = [
  { label: "Ringkasan", segment: "ringkasan" },
  { label: "Produk", segment: "produk" },
  { label: "Transaksi", segment: "transaksi" },
];

function AnalyticsDropdown({
  orgSlug,
  isActive,
  isOpen,
  onToggle,
  pathname,
}: {
  orgSlug?: string;
  isActive: boolean;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  pathname: string;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onToggle(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onToggle]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => onToggle(!isOpen)}
        className={cn(
          "relative px-3 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer",
          isActive
            ? "text-copper bg-copper/8"
            : "text-carbon-300 hover:text-carbon-50 hover:bg-carbon-800/60"
        )}
      >
        Analitik
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={cn(
            "transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        >
          <path
            d="M2.5 4l2.5 2.5L7.5 4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {isActive && (
          <span className="absolute -bottom-px left-3 right-3 h-px bg-copper" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 mt-1 min-w-[160px] bg-carbon-900 border border-carbon-700/50 rounded-sm shadow-elevated overflow-hidden z-50"
          >
            {analyticsSubPages.map((page) => {
              const href = orgSlug
                ? `/org/${orgSlug}/analytics/${page.segment}`
                : "#";
              const active = pathname.includes(
                `/analytics/${page.segment}`
              );
              return (
                <Link
                  key={page.segment}
                  href={href}
                  onClick={() => onToggle(false)}
                  className={cn(
                    "block px-4 py-2.5 text-xs uppercase tracking-wider transition-colors",
                    active
                      ? "text-copper bg-copper/8"
                      : "text-carbon-300 hover:text-copper hover:bg-carbon-800/60"
                  )}
                >
                  {page.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Analytics Accordion (Mobile) ──────────────────────────────────
function MobileAnalyticsAccordion({
  orgSlug,
  isActive,
  isOpen,
  onToggle,
  pathname,
  onNavigate,
}: {
  orgSlug?: string;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 text-sm uppercase tracking-wider rounded-sm transition-colors cursor-pointer",
          isActive
            ? "text-copper bg-copper/8"
            : "text-carbon-300 hover:text-carbon-50 hover:bg-carbon-800/60"
        )}
      >
        Analitik
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={cn(
            "transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        >
          <path
            d="M3 4.5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-4 py-1 space-y-0.5">
              {analyticsSubPages.map((page) => {
                const href = orgSlug
                  ? `/org/${orgSlug}/analytics/${page.segment}`
                  : "#";
                const active = pathname.includes(
                  `/analytics/${page.segment}`
                );
                return (
                  <Link
                    key={page.segment}
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      "block px-4 py-2 text-xs uppercase tracking-wider rounded-sm transition-colors",
                      active
                        ? "text-copper bg-copper/8"
                        : "text-carbon-400 hover:text-carbon-200 hover:bg-carbon-800/60"
                    )}
                  >
                    {page.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
