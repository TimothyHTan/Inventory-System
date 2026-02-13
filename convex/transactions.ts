import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getOrgMembership,
  requireMinRole,
  ROLE_TIER,
  isWithinDeleteWindow,
} from "./helpers";

export const list = query({
  args: {
    productId: v.id("products"),
    month: v.optional(v.string()), // "2026-01" format
  },
  handler: async (ctx, { productId, month }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const product = await ctx.db.get(productId);
    if (!product || !product.organizationId) return [];

    const membership = await getOrgMembership(
      ctx,
      userId,
      product.organizationId
    );
    if (!membership) return [];

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

// List all MASUK transactions for an organization (for the inbound page)
export const listInbound = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membership = await getOrgMembership(ctx, userId, organizationId);
    if (!membership || ROLE_TIER[membership.role] < ROLE_TIER["logistic"]) {
      return [];
    }

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .collect();

    // Filter to only MASUK (in) transactions, enrich with product names
    const inbound = transactions.filter((tx) => tx.type === "in");

    const enriched = await Promise.all(
      inbound.map(async (tx) => {
        const product = await ctx.db.get(tx.productId);
        const creator = tx.createdBy ? await ctx.db.get(tx.createdBy) : null;
        return {
          ...tx,
          productName: product?.name ?? "—",
          creatorName: creator?.name || creator?.email || "—",
        };
      })
    );

    return enriched;
  },
});

export const add = mutation({
  args: {
    productId: v.id("products"),
    type: v.union(v.literal("in"), v.literal("out")),
    quantity: v.number(),
    description: v.string(),
    date: v.string(),
    // Internal flag — only set by stockRequests.fulfill
    _internal_source: v.optional(
      v.union(v.literal("direct"), v.literal("request"))
    ),
  },
  handler: async (
    ctx,
    { productId, type, quantity, description, date, _internal_source }
  ) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    if (quantity <= 0) throw new Error("Jumlah harus positif");

    const product = await ctx.db.get(productId);
    if (!product || !product.organizationId)
      throw new Error("Produk tidak ditemukan");

    // KELUAR transactions can only be created via request fulfillment
    if (type === "out" && _internal_source !== "request") {
      throw new Error(
        "Transaksi KELUAR hanya dapat dibuat melalui pemenuhan permintaan stok."
      );
    }

    // Require logistic+ for direct MASUK
    await requireMinRole(ctx, userId, product.organizationId, "logistic");

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

    const source = _internal_source || "direct";

    const txId = await ctx.db.insert("transactions", {
      productId,
      date,
      type,
      quantity,
      description,
      runningBalance: newBalance,
      createdAt: Date.now(),
      createdBy: userId,
      organizationId: product.organizationId,
      source,
    });

    await ctx.db.patch(productId, {
      currentStock: newBalance,
      updatedAt: Date.now(),
    });

    return { newBalance, txId };
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    const tx = await ctx.db.get(id);
    if (!tx || !tx.organizationId)
      throw new Error("Transaksi tidak ditemukan");

    const membership = await requireMinRole(
      ctx,
      userId,
      tx.organizationId,
      "logistic"
    );

    // Tiered delete: logistic can only delete within 60 minutes
    if (membership.role === "logistic") {
      if (!isWithinDeleteWindow(tx.createdAt)) {
        throw new Error(
          "Transaksi ini sudah lebih dari 60 menit dan tidak dapat dihapus oleh Staf Logistik."
        );
      }
    }
    // manager, owner, admin — always allowed (already passed requireMinRole)

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

export const bulkRemove = mutation({
  args: { ids: v.array(v.id("transactions")) },
  handler: async (ctx, { ids }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    let deleted = 0;
    let skipped = 0;

    for (const id of ids) {
      const tx = await ctx.db.get(id);
      if (!tx || !tx.organizationId) continue;

      const membership = await requireMinRole(
        ctx,
        userId,
        tx.organizationId,
        "logistic"
      );

      // Logistic: skip transactions outside the 60-min window
      if (membership.role === "logistic") {
        if (!isWithinDeleteWindow(tx.createdAt)) {
          skipped++;
          continue;
        }
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
      deleted++;
    }

    return { deleted, skipped };
  },
});
