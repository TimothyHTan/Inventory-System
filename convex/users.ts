import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getOrgMembership, requireMinRole, displayName } from "./helpers";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") return [];

    return await ctx.db.query("users").collect();
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("staff")),
  },
  handler: async (ctx, { userId, role }) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const currentUser = await ctx.db.get(currentUserId);
    if (currentUser?.role !== "admin") throw new Error("Admin access required");

    await ctx.db.patch(userId, { role });
  },
});

// First user to call this becomes admin (only works when no admin exists)
export const setupFirstAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const users = await ctx.db.query("users").collect();
    const hasAdmin = users.some((u) => u.role === "admin");
    if (hasAdmin) throw new Error("Admin sudah ada");

    await ctx.db.patch(userId, { role: "admin" });
  },
});

// ── Display Name Change (with approval) ─────────────────────────

/** Any authenticated user can request a display name change.
 *  If the user has no name yet, it's set directly (no approval needed).
 *  If the user already has a name, it goes through manager approval. */
export const requestNameChange = mutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
    newName: v.string(),
  },
  handler: async (ctx, { newName }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    const trimmed = newName.trim();
    if (!trimmed) throw new Error("Nama tidak boleh kosong");
    if (trimmed.length > 50) throw new Error("Nama maksimal 50 karakter");

    const user = await ctx.db.get(userId);

    // No name yet → set directly without approval
    if (!user?.name) {
      await ctx.db.patch(userId, { name: trimmed });
      return { direct: true };
    }

    // Already has a name → needs manager approval
    await ctx.db.patch(userId, { pendingName: trimmed });
    return { direct: false };
  },
});

/** Manager+ approves a pending name change */
export const approveNameChange = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { userId, organizationId }) => {
    const approverId = await getAuthUserId(ctx);
    if (!approverId) throw new Error("Tidak terautentikasi");

    await requireMinRole(ctx, approverId, organizationId, "manager");

    const user = await ctx.db.get(userId);
    if (!user || !user.pendingName) {
      throw new Error("Tidak ada permintaan perubahan nama");
    }

    await ctx.db.patch(userId, {
      name: user.pendingName,
      pendingName: undefined,
    });
  },
});

/** Manager+ rejects a pending name change */
export const rejectNameChange = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { userId, organizationId }) => {
    const approverId = await getAuthUserId(ctx);
    if (!approverId) throw new Error("Tidak terautentikasi");

    await requireMinRole(ctx, approverId, organizationId, "manager");

    await ctx.db.patch(userId, { pendingName: undefined });
  },
});

/** List pending name changes for org members. Manager+ only. */
export const pendingNameChanges = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membership = await getOrgMembership(ctx, userId, organizationId);
    if (!membership) return [];

    await requireMinRole(ctx, userId, organizationId, "manager");

    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    const pending: Array<{
      userId: string;
      currentName: string;
      pendingName: string;
      email: string;
    }> = [];

    for (const m of members) {
      const user = await ctx.db.get(m.userId);
      if (user?.pendingName) {
        pending.push({
          userId: m.userId,
          currentName: displayName(user),
          pendingName: user.pendingName,
          email: user.email || "—",
        });
      }
    }

    return pending;
  },
});
