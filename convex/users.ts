import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
