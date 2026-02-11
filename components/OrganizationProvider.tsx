"use client";

import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

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

export function OrganizationProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const data = useQuery(api.organizations.getBySlug, { slug });

  const role = data?.membership?.role;
  const tier = role ? ROLE_TIER[role] ?? 0 : 0;

  const value: OrgContextType = {
    org: data?.org ?? null,
    membership: data?.membership ?? null,
    isEmployee: !!data?.membership,
    isLogistic: tier >= ROLE_TIER["logistic"],
    isManager: tier >= ROLE_TIER["manager"],
    isOwner: tier >= ROLE_TIER["owner"],
    isAdmin: role === "admin",
    canEdit: tier >= ROLE_TIER["logistic"],
    isLoading: data === undefined,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrganization() {
  return useContext(OrgContext);
}
