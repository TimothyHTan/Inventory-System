"use client";

import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

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
    role: "admin" | "member" | "viewer";
  } | null;
  isAdmin: boolean;
  canEdit: boolean; // admin or member
  isLoading: boolean;
}

const OrgContext = createContext<OrgContextType>({
  org: null,
  membership: null,
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

  const value: OrgContextType = {
    org: data?.org ?? null,
    membership: data?.membership ?? null,
    isAdmin: data?.membership?.role === "admin",
    canEdit:
      data?.membership?.role === "admin" ||
      data?.membership?.role === "member",
    isLoading: data === undefined,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrganization() {
  return useContext(OrgContext);
}
