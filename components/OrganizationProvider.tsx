"use client";

import {
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useQuery } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "motion/react";

// Role tier map — mirrors convex/helpers.ts on the client
export const ROLE_TIER: Record<string, number> = {
  employee: 1,
  logistic: 2,
  manager: 3,
  owner: 4,
  admin: 5,
};

export type OrgRole = "employee" | "logistic" | "manager" | "owner" | "admin";

// Indonesian labels for each role
export const ROLE_LABELS: Record<string, string> = {
  employee: "Karyawan",
  logistic: "Staf Logistik",
  manager: "Manajer",
  owner: "Pemilik",
  admin: "Admin",
};

interface OrgContextType {
  org: {
    _id: Id<"organizations">;
    name: string;
    slug: string;
    createdBy: Id<"users">;
    createdAt: number;
  } | null;
  membership: {
    _id: Id<"organizationMembers">;
    userId: Id<"users">;
    role: OrgRole;
  } | null;
  // Tier booleans — true if user is at least that tier
  isEmployee: boolean;
  isLogistic: boolean;
  isManager: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  canEdit: boolean; // alias for isLogistic (backward compat)
  isLoading: boolean;
}

const OrgContext = createContext<OrgContextType>({
  org: null,
  membership: null,
  isEmployee: false,
  isLogistic: false,
  isManager: false,
  isOwner: false,
  isAdmin: false,
  canEdit: false,
  isLoading: true,
});

// ── Page access requirements ─────────────────────────────────────
// Maps page path segments to the minimum role tier needed
function getMinTierForPath(pathname: string): number {
  if (pathname.includes("/settings")) return ROLE_TIER["manager"];
  if (pathname.includes("/analytics")) return ROLE_TIER["manager"];
  if (pathname.includes("/data")) return ROLE_TIER["manager"];
  if (pathname.includes("/inbound")) return ROLE_TIER["logistic"];
  // dashboard, requests, products — accessible to all members
  return ROLE_TIER["employee"];
}

export function OrganizationProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const data = useQuery(api.organizations.getBySlug, { slug });

  const role = data?.membership?.role as OrgRole | undefined;
  const tier = role ? ROLE_TIER[role] ?? 0 : 0;

  // ── Role-change detection ────────────────────────────────────
  const prevRoleRef = useRef<OrgRole | undefined>(undefined);
  const [roleNotification, setRoleNotification] = useState<{
    oldRole: OrgRole;
    newRole: OrgRole;
    redirecting: boolean;
  } | null>(null);

  const dismissNotification = useCallback(() => {
    setRoleNotification(null);
  }, []);

  useEffect(() => {
    const prevRole = prevRoleRef.current;

    // Only react after the initial load (prevRole must have been set)
    if (prevRole && role && prevRole !== role) {
      const needsRedirect = tier < getMinTierForPath(pathname);

      setRoleNotification({
        oldRole: prevRole,
        newRole: role,
        redirecting: needsRedirect,
      });

      if (needsRedirect) {
        // Redirect to dashboard after a short delay so the user sees the notification
        const timeout = setTimeout(() => {
          router.push(`/org/${slug}/dashboard`);
          // Auto-dismiss after redirect
          setTimeout(() => setRoleNotification(null), 1500);
        }, 2000);
        return () => clearTimeout(timeout);
      } else {
        // Auto-dismiss after 5 seconds if no redirect needed
        const timeout = setTimeout(() => setRoleNotification(null), 5000);
        return () => clearTimeout(timeout);
      }
    }

    // Track the current role for next comparison
    if (role) {
      prevRoleRef.current = role;
    }
  }, [role, tier, pathname, router, slug]);

  const value: OrgContextType = {
    org: data?.org ?? null,
    membership: data?.membership
      ? {
          _id: data.membership._id,
          userId: data.membership.userId,
          role: data.membership.role as OrgRole,
        }
      : null,
    isEmployee: !!data?.membership,
    isLogistic: tier >= ROLE_TIER["logistic"],
    isManager: tier >= ROLE_TIER["manager"],
    isOwner: tier >= ROLE_TIER["owner"],
    isAdmin: role === "admin",
    canEdit: tier >= ROLE_TIER["logistic"],
    isLoading: data === undefined,
  };

  return (
    <OrgContext.Provider value={value}>
      {children}

      {/* Role-change notification banner */}
      <AnimatePresence>
        {roleNotification && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[calc(100%-2rem)]"
          >
            <div className="bg-carbon-800 border border-copper/30 rounded-sm shadow-lg shadow-carbon-950/50 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-copper/15 border border-copper/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-copper"
                  >
                    <path
                      d="M8 3v5M8 10.5h.01"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-carbon-50">
                    Role Anda telah diubah
                  </p>
                  <p className="text-xs text-carbon-400 mt-1">
                    {ROLE_LABELS[roleNotification.oldRole]} &rarr;{" "}
                    <span className="text-copper font-medium">
                      {ROLE_LABELS[roleNotification.newRole]}
                    </span>
                  </p>
                  {roleNotification.redirecting && (
                    <p className="text-[10px] text-carbon-500 mt-1.5">
                      Mengalihkan ke halaman yang tersedia...
                    </p>
                  )}
                </div>
                <button
                  onClick={dismissNotification}
                  className="text-carbon-500 hover:text-carbon-300 transition-colors p-1 -mr-1 -mt-1"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                  >
                    <path
                      d="M4 4l6 6M10 4l-6 6"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </OrgContext.Provider>
  );
}

export function useOrganization() {
  return useContext(OrgContext);
}
