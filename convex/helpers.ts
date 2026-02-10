import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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

/** Require the user to have one of the specified roles in the org. Throws if not. */
export async function requireOrgRole(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">,
  allowedRoles: Array<"admin" | "member" | "viewer">
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
