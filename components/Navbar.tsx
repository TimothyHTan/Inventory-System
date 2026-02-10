"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { useOrganization } from "@/components/OrganizationProvider";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  member: "Anggota",
  viewer: "Pengamat",
};

export function Navbar() {
  const pathname = usePathname();
  const user = useQuery(api.users.current);
  const { signOut } = useAuthActions();
  const { org, membership } = useOrganization();

  const orgSlug = org?.slug;
  const dashboardHref = orgSlug
    ? `/org/${orgSlug}/dashboard`
    : "/dashboard";
  const settingsHref = orgSlug
    ? `/org/${orgSlug}/settings`
    : "/settings";

  const isAdmin = membership?.role === "admin";

  return (
    <nav className="sticky top-0 z-30 bg-carbon-900/90 backdrop-blur-md border-b border-carbon-700/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left — Logo + Org Switcher + Nav */}
          <div className="flex items-center gap-4">
            <Link href={dashboardHref} className="flex items-center gap-2.5">
              {/* Copper diamond icon */}
              <div className="w-5 h-5 rotate-45 border-2 border-copper flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-copper" />
              </div>
              <span className="font-display text-lg text-carbon-50 hidden sm:block">
                StockCard
              </span>
            </Link>

            <div className="h-4 w-px bg-carbon-700/60 hidden sm:block" />

            {/* Org Switcher */}
            {org && (
              <>
                <OrgSwitcher />
                <div className="h-4 w-px bg-carbon-700/60 hidden sm:block" />
              </>
            )}

            <div className="flex items-center gap-1">
              <NavLink
                href={dashboardHref}
                active={pathname.endsWith("/dashboard")}
              >
                Dashboard
              </NavLink>
              {isAdmin && (
                <NavLink
                  href={settingsHref}
                  active={pathname.endsWith("/settings")}
                >
                  Pengaturan
                </NavLink>
              )}
            </div>
          </div>

          {/* Right — User info + status */}
          <div className="flex items-center gap-3">
            {/* Connection indicator */}
            <div className="flex items-center gap-1.5">
              <span className="status-dot bg-sage animate-pulse-slow" />
              <span className="text-[10px] text-carbon-400 font-mono hidden sm:block">
                LIVE
              </span>
            </div>

            <div className="h-4 w-px bg-carbon-700/60" />

            {user && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-carbon-300 hidden sm:block">
                  {user.name || user.email}
                </span>
                {membership && (
                  <Badge
                    variant={membership.role === "admin" ? "copper" : "muted"}
                  >
                    {roleLabels[membership.role] || membership.role}
                  </Badge>
                )}
              </div>
            )}

            <button
              onClick={() => void signOut()}
              className="text-xs text-carbon-400 hover:text-carbon-100 transition-colors px-2 py-1"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-copper/20 to-transparent" />
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors",
        active
          ? "text-copper bg-copper/8"
          : "text-carbon-300 hover:text-carbon-50 hover:bg-carbon-800/60"
      )}
    >
      {children}
    </Link>
  );
}
