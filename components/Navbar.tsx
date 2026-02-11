"use client";

import { useState } from "react";
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
  const { org, membership, isLogistic, isOwner, isAdmin } = useOrganization();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const orgSlug = org?.slug;
  const dashboardHref = orgSlug ? `/org/${orgSlug}/dashboard` : "/dashboard";
  const settingsHref = orgSlug ? `/org/${orgSlug}/settings` : "/settings";
  const requestsHref = orgSlug ? `/org/${orgSlug}/requests` : "#";
  const inboundHref = orgSlug ? `/org/${orgSlug}/inbound` : "#";

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
            {isOwner && (
              <NavLink
                href={settingsHref}
                active={pathname.endsWith("/settings")}
              >
                Pengaturan
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
            {isOwner && (
              <MobileNavLink
                href={settingsHref}
                active={pathname.endsWith("/settings")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Pengaturan
              </MobileNavLink>
            )}
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
