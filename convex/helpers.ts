import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Role tier map — higher number = more privilege
export const ROLE_TIER: Record<string, number> = {
  employee: 1,
  logistic: 2,
  manager: 3,
  owner: 4,
  admin: 5,
};

export type OrgRole = "employee" | "logistic" | "manager" | "owner" | "admin";

/** Get a user's membership in an organization */
export async function getOrgMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">
) {
  return await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .unique();
}

/** Require the user to have at least `minRole` tier in the org. Throws if not. */
export async function requireMinRole(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">,
  minRole: OrgRole
) {
  const membership = await getOrgMembership(ctx, userId, organizationId);
  if (!membership) throw new Error("Bukan anggota organisasi ini");
  if (ROLE_TIER[membership.role] < ROLE_TIER[minRole]) {
    throw new Error("Akses ditolak");
  }
  return membership;
}

/** Check if a transaction is within the 60-minute delete window */
export function isWithinDeleteWindow(createdAt: number): boolean {
  const SIXTY_MINUTES_MS = 60 * 60 * 1000;
  return Date.now() - createdAt < SIXTY_MINUTES_MS;
}

/** @deprecated Use requireMinRole instead */
export async function requireOrgRole(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">,
  allowedRoles: string[]
) {
  const membership = await getOrgMembership(ctx, userId, organizationId);
  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new Error("Akses ditolak");
  }
  return membership;
}

/** Generate a URL-safe slug from a name */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 48);
}

/** Generate a random invite code (8 chars, alphanumeric) */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
