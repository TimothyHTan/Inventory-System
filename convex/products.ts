import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("products").order("asc").collect();
  },
});

export const search = query({
  args: { searchQuery: v.string() },
  handler: async (ctx, { searchQuery }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (!searchQuery.trim()) {
      return await ctx.db.query("products").order("asc").collect();
    }
    return await ctx.db
      .query("products")
      .withSearchIndex("search_name", (q) => q.search("name", searchQuery))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    initialStock: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { name, initialStock, description }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Admin access required");

    const now = Date.now();
    const productId = await ctx.db.insert("products", {
      name,
      description,
      currentStock: initialStock,
      createdAt: now,
      updatedAt: now,
    });

    // Log initial stock as an "in" transaction
    if (initialStock > 0) {
      await ctx.db.insert("transactions", {
        productId,
        date: new Date().toISOString().split("T")[0],
        type: "in",
        quantity: initialStock,
        description: "Stok Awal",
        runningBalance: initialStock,
        createdAt: now,
        createdBy: userId,
      });
    }

    return productId;
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, description }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Admin access required");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Admin access required");

    // Remove all transactions for this product
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_product", (q) => q.eq("productId", id))
      .collect();
    for (const tx of transactions) {
      await ctx.db.delete(tx._id);
    }

    await ctx.db.delete(id);
  },
});
