import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireOrgRole, getOrgMembership } from "./helpers";

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membership = await getOrgMembership(ctx, userId, organizationId);
    if (!membership) return [];

    return await ctx.db
      .query("products")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("asc")
      .collect();
  },
});

export const search = query({
  args: {
    searchQuery: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { searchQuery, organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membership = await getOrgMembership(ctx, userId, organizationId);
    if (!membership) return [];

    if (!searchQuery.trim()) {
      return await ctx.db
        .query("products")
        .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
        .order("asc")
        .collect();
    }

    return await ctx.db
      .query("products")
      .withSearchIndex("search_name", (q) =>
        q.search("name", searchQuery).eq("organizationId", organizationId)
      )
      .collect();
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const product = await ctx.db.get(id);
    if (!product) return null;

    // Verify user has access to this product's org
    if (product.organizationId) {
      const membership = await getOrgMembership(
        ctx,
        userId,
        product.organizationId
      );
      if (!membership) return null;
    }

    return product;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    initialStock: v.number(),
    description: v.optional(v.string()),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { name, initialStock, description, organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    await requireOrgRole(ctx, userId, organizationId, ["admin", "member"]);

    const now = Date.now();
    const productId = await ctx.db.insert("products", {
      name,
      description,
      currentStock: initialStock,
      createdAt: now,
      updatedAt: now,
      organizationId,
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
        organizationId,
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
    if (!userId) throw new Error("Tidak terautentikasi");

    const product = await ctx.db.get(id);
    if (!product) throw new Error("Produk tidak ditemukan");

    if (product.organizationId) {
      await requireOrgRole(ctx, userId, product.organizationId, [
        "admin",
        "member",
      ]);
    }

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
    if (!userId) throw new Error("Tidak terautentikasi");

    const product = await ctx.db.get(id);
    if (!product) throw new Error("Produk tidak ditemukan");

    if (product.organizationId) {
      await requireOrgRole(ctx, userId, product.organizationId, ["admin"]);
    }

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

export const bulkRemove = mutation({
  args: { ids: v.array(v.id("products")) },
  handler: async (ctx, { ids }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    let deleted = 0;

    for (const id of ids) {
      const product = await ctx.db.get(id);
      if (!product) continue;

      if (product.organizationId) {
        await requireOrgRole(ctx, userId, product.organizationId, ["admin"]);
      }

      // Remove all transactions for this product
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_product", (q) => q.eq("productId", id))
        .collect();
      for (const tx of transactions) {
        await ctx.db.delete(tx._id);
      }

      await ctx.db.delete(id);
      deleted++;
    }

    return { deleted };
  },
});
