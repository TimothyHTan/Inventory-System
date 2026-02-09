import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    productId: v.id("products"),
    month: v.optional(v.string()), // "2026-01" format
  },
  handler: async (ctx, { productId, month }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let transactions;

    if (month) {
      // Use by_product_date index and filter by month prefix
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
    if (!userId) throw new Error("Not authenticated");

    if (quantity <= 0) throw new Error("Quantity must be positive");

    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Product not found");

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
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Admin access required");

    const tx = await ctx.db.get(id);
    if (!tx) throw new Error("Transaction not found");

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
