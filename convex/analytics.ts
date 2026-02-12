import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getOrgMembership, requireMinRole } from "./helpers";

// ── Summary analytics ────────────────────────────────────────────
export const getSummary = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { organizationId, startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    await requireMinRole(ctx, userId, organizationId, "manager");

    // Get all products for this org
    const products = await ctx.db
      .query("products")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.currentStock, 0);
    const lowStockCount = products.filter(
      (p) => p.currentStock > 0 && p.currentStock < 100
    ).length;
    const emptyCount = products.filter((p) => p.currentStock === 0).length;
    const normalCount = totalProducts - lowStockCount - emptyCount;

    // Get transactions in date range using compound index
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_org_date", (q) =>
        q
          .eq("organizationId", organizationId)
          .gte("date", startDate)
          .lte("date", endDate)
      )
      .collect();

    const transactionsInPeriod = transactions.length;

    // Aggregate trend data by date
    const trendMap = new Map<string, { masuk: number; keluar: number }>();
    const productTxMap = new Map<
      string,
      { totalTx: number; masuk: number; keluar: number }
    >();

    for (const tx of transactions) {
      // Daily trend
      const existing = trendMap.get(tx.date) || { masuk: 0, keluar: 0 };
      if (tx.type === "in") existing.masuk += tx.quantity;
      else existing.keluar += tx.quantity;
      trendMap.set(tx.date, existing);

      // Per-product aggregation
      const pid = tx.productId;
      const pExisting = productTxMap.get(pid) || {
        totalTx: 0,
        masuk: 0,
        keluar: 0,
      };
      pExisting.totalTx++;
      if (tx.type === "in") pExisting.masuk += tx.quantity;
      else pExisting.keluar += tx.quantity;
      productTxMap.set(pid, pExisting);
    }

    // Sort trend data by date
    const trendData = Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top 5 products by transaction count
    const productMap = new Map(products.map((p) => [p._id, p]));
    const topProducts = Array.from(productTxMap.entries())
      .sort((a, b) => b[1].totalTx - a[1].totalTx)
      .slice(0, 5)
      .map(([pid, data]) => {
        const product = productMap.get(pid as any);
        return {
          name: product?.name ?? "—",
          currentStock: product?.currentStock ?? 0,
          ...data,
        };
      });

    return {
      totalProducts,
      totalStock,
      transactionsInPeriod,
      lowStockCount,
      trendData,
      topProducts,
      stockDistribution: {
        empty: emptyCount,
        low: lowStockCount,
        normal: normalCount,
      },
    };
  },
});

// ── Product analytics ────────────────────────────────────────────
export const getProductAnalytics = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { organizationId, startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    await requireMinRole(ctx, userId, organizationId, "manager");

    const products = await ctx.db
      .query("products")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    const totalProducts = products.length;
    const emptyStock = products.filter((p) => p.currentStock === 0).length;
    const lowStockCount = products.filter(
      (p) => p.currentStock > 0 && p.currentStock < 100
    ).length;
    const normalCount = totalProducts - emptyStock - lowStockCount;

    // Find last transaction date per product
    const now = Date.now();
    const slowMoving: Array<{
      name: string;
      currentStock: number;
      lastTransactionDays: number;
    }> = [];

    for (const product of products) {
      const lastTx = await ctx.db
        .query("transactions")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .order("desc")
        .first();

      const daysSince = lastTx
        ? Math.floor((now - lastTx.createdAt) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSince >= 30) {
        slowMoving.push({
          name: product.name,
          currentStock: product.currentStock,
          lastTransactionDays: daysSince,
        });
      }
    }

    // Sort slow moving by days since last transaction (desc)
    slowMoving.sort((a, b) => b.lastTransactionDays - a.lastTransactionDays);

    // Top 10 products by stock level
    const topProductsByStock = products
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 10)
      .map((p) => ({
        name: p.name,
        stock: p.currentStock,
        status:
          p.currentStock === 0
            ? ("empty" as const)
            : p.currentStock < 100
              ? ("low" as const)
              : ("normal" as const),
      }));

    return {
      totalProducts,
      emptyStock,
      slowMovingCount: slowMoving.length,
      slowMoving: slowMoving.slice(0, 20),
      stockDistribution: { empty: emptyStock, low: lowStockCount, normal: normalCount },
      topProductsByStock,
    };
  },
});

// ── Transaction analytics ────────────────────────────────────────
export const getTransactionAnalytics = query({
  args: {
    organizationId: v.id("organizations"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { organizationId, startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    await requireMinRole(ctx, userId, organizationId, "manager");

    // Get transactions in date range
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_org_date", (q) =>
        q
          .eq("organizationId", organizationId)
          .gte("date", startDate)
          .lte("date", endDate)
      )
      .collect();

    let totalMasuk = 0;
    let totalKeluar = 0;

    // Daily aggregation
    const dailyMap = new Map<string, { masuk: number; keluar: number }>();
    // Monthly aggregation
    const monthlyMap = new Map<
      string,
      {
        masukCount: number;
        keluarCount: number;
        masukQty: number;
        keluarQty: number;
      }
    >();

    for (const tx of transactions) {
      if (tx.type === "in") totalMasuk += tx.quantity;
      else totalKeluar += tx.quantity;

      // Daily
      const daily = dailyMap.get(tx.date) || { masuk: 0, keluar: 0 };
      if (tx.type === "in") daily.masuk += tx.quantity;
      else daily.keluar += tx.quantity;
      dailyMap.set(tx.date, daily);

      // Monthly
      const month = tx.date.substring(0, 7); // "2026-01"
      const monthly = monthlyMap.get(month) || {
        masukCount: 0,
        keluarCount: 0,
        masukQty: 0,
        keluarQty: 0,
      };
      if (tx.type === "in") {
        monthly.masukCount++;
        monthly.masukQty += tx.quantity;
      } else {
        monthly.keluarCount++;
        monthly.keluarQty += tx.quantity;
      }
      monthlyMap.set(month, monthly);
    }

    const dailyTrends = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Recent 10 transactions (enriched)
    const recentTx = transactions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);

    const recentTransactions = await Promise.all(
      recentTx.map(async (tx) => {
        const product = await ctx.db.get(tx.productId);
        const creator = tx.createdBy ? await ctx.db.get(tx.createdBy) : null;
        return {
          _id: tx._id,
          date: tx.date,
          type: tx.type,
          quantity: tx.quantity,
          description: tx.description,
          productName: product?.name ?? "—",
          productId: tx.productId,
          creatorName: creator?.name || creator?.email || "—",
        };
      })
    );

    return {
      totalTransactions: transactions.length,
      totalMasuk,
      totalKeluar,
      netChange: totalMasuk - totalKeluar,
      dailyTrends,
      monthlyData,
      recentTransactions,
    };
  },
});
