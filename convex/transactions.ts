import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireOrgRole, getOrgMembership } from "./helpers";

export const list = query({
  args: {
    productId: v.id("products"),
    month: v.optional(v.string()), // "2026-01" format
  },
  handler: async (ctx, { productId, month }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify user has access to this product's org
    const product = await ctx.db.get(productId);
    if (!product) return [];
    if (product.organizationId) {
      const membership = await getOrgMembership(
        ctx,
        userId,
        product.organizationId
      );
      if (!membership) return [];
    }

    let transactions;

    if (month) {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_product_date", (q) => q.eq("productId", productId))
        .order("desc")
        .collect();
      transactions = transactions.filter((tx) => tx.date.startsWith(month));
    } else {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .order("desc")
        .collect();
    }

    return transactions;
  },
});

export const add = mutation({
  args: {
    productId: v.id("products"),
    type: v.union(v.literal("in"), v.literal("out")),
    quantity: v.number(),
    description: v.string(),
    date: v.string(),
  },
  handler: async (ctx, { productId, type, quantity, description, date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    if (quantity <= 0) throw new Error("Jumlah harus positif");

    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Produk tidak ditemukan");

    // Check org membership (admin or member can add transactions)
    if (product.organizationId) {
      await requireOrgRole(ctx, userId, product.organizationId, [
        "admin",
        "member",
      ]);
    }

    // Prevent negative inventory
    if (type === "out" && quantity > product.currentStock) {
      throw new Error(
        `Stok tidak cukup. Sisa: ${product.currentStock}, diminta: ${quantity}`
      );
    }

    const newBalance =
      type === "in"
        ? product.currentStock + quantity
        : product.currentStock - quantity;

    // Insert transaction record
    await ctx.db.insert("transactions", {
      productId,
      date,
      type,
      quantity,
      description,
      runningBalance: newBalance,
      createdAt: Date.now(),
      createdBy: userId,
      organizationId: product.organizationId,
    });

    // Update product stock (atomic — same mutation)
    await ctx.db.patch(productId, {
      currentStock: newBalance,
      updatedAt: Date.now(),
    });

    return newBalance;
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    const tx = await ctx.db.get(id);
    if (!tx) throw new Error("Transaksi tidak ditemukan");

    // Check org admin permission
    if (tx.organizationId) {
      await requireOrgRole(ctx, userId, tx.organizationId, ["admin"]);
    }

    // Reverse the stock change
    const product = await ctx.db.get(tx.productId);
    if (product) {
      const revertedStock =
        tx.type === "in"
          ? product.currentStock - tx.quantity
          : product.currentStock + tx.quantity;

      await ctx.db.patch(tx.productId, {
        currentStock: revertedStock,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.delete(id);
  },
});
