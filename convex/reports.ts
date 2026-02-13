import { v } from "convex/values";
import {
  query,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireMinRole } from "./helpers";

// ── Queries ──────────────────────────────────────────────────────

/** List all reports for an organization (newest first). Manager+ only. */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    await requireMinRole(ctx, userId, organizationId, "manager");

    return await ctx.db
      .query("reports")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .collect();
  },
});

/** Check if a report exists for a specific month. */
export const getByMonth = query({
  args: {
    organizationId: v.id("organizations"),
    month: v.string(),
  },
  handler: async (ctx, { organizationId, month }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    await requireMinRole(ctx, userId, organizationId, "manager");

    return await ctx.db
      .query("reports")
      .withIndex("by_org_month", (q) =>
        q.eq("organizationId", organizationId).eq("month", month)
      )
      .unique();
  },
});

// ── Public mutation: manual trigger ──────────────────────────────

/** Manager+ triggers report generation for a specific month. */
export const generate = mutation({
  args: {
    organizationId: v.id("organizations"),
    month: v.string(),
    productId: v.optional(v.id("products")),
  },
  handler: async (ctx, { organizationId, month, productId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");
    await requireMinRole(ctx, userId, organizationId, "manager");

    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new Error("Format bulan tidak valid. Gunakan YYYY-MM.");
    }

    let productName: string | undefined;
    if (productId) {
      const product = await ctx.db.get(productId);
      if (!product || product.organizationId !== organizationId) {
        throw new Error("Produk tidak ditemukan");
      }
      productName = product.name;
    }

    await ctx.scheduler.runAfter(0, internal.reportActions.generateReport, {
      organizationId,
      month,
      generatedBy: userId,
      productId,
      productName,
    });

    return { scheduled: true };
  },
});

// ── Internal mutations (called by the action) ───────────────────

/** Create a report record with status "generating". Deletes existing for same org+month+product. */
export const createReport = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    month: v.string(),
    generatedBy: v.optional(v.id("users")),
    productId: v.optional(v.id("products")),
    productName: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, month, generatedBy, productId, productName }) => {
    // Find existing report for the same org+month+product combo
    const candidates = await ctx.db
      .query("reports")
      .withIndex("by_org_month", (q) =>
        q.eq("organizationId", organizationId).eq("month", month)
      )
      .collect();
    const existing = candidates.find((r) =>
      productId ? r.productId === productId : !r.productId
    );
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("reports", {
      organizationId,
      month,
      status: "generating",
      generatedBy,
      productId,
      productName,
      createdAt: Date.now(),
    });
  },
});

/** Mark a report as completed with file info. */
export const markCompleted = internalMutation({
  args: {
    reportId: v.id("reports"),
    fileKey: v.string(),
    fileUrl: v.string(),
    fileSize: v.number(),
    productCount: v.number(),
    transactionCount: v.number(),
  },
  handler: async (ctx, { reportId, ...data }) => {
    await ctx.db.patch(reportId, {
      status: "completed" as const,
      ...data,
      generatedAt: Date.now(),
    });
  },
});

/** Mark a report as failed. */
export const markFailed = internalMutation({
  args: {
    reportId: v.id("reports"),
    error: v.string(),
  },
  handler: async (ctx, { reportId, error }) => {
    await ctx.db.patch(reportId, {
      status: "failed" as const,
      error,
      generatedAt: Date.now(),
    });
  },
});

/** Delete a report record from the database. */
export const deleteRecord = internalMutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    await ctx.db.delete(reportId);
  },
});

/** Manager+ deletes a report (schedules R2 cleanup + DB delete). */
export const remove = mutation({
  args: {
    organizationId: v.id("organizations"),
    reportId: v.id("reports"),
  },
  handler: async (ctx, { organizationId, reportId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");
    await requireMinRole(ctx, userId, organizationId, "manager");

    const report = await ctx.db.get(reportId);
    if (!report || report.organizationId !== organizationId) {
      throw new Error("Laporan tidak ditemukan");
    }

    await ctx.scheduler.runAfter(0, internal.reportActions.deleteReport, {
      reportId,
      fileKey: report.fileKey,
    });
  },
});

// ── Internal queries (data for the action) ──────────────────────

/** Fetch all products + transactions for an org+month, plus opening balances. */
export const getExportData = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    month: v.string(),
    productId: v.optional(v.id("products")),
  },
  handler: async (ctx, { organizationId, month, productId }) => {
    const org = await ctx.db.get(organizationId);
    if (!org) return null;

    let products;
    if (productId) {
      const product = await ctx.db.get(productId);
      products = product && product.organizationId === organizationId ? [product] : [];
    } else {
      products = await ctx.db
        .query("products")
        .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
        .collect();
    }

    const monthStart = `${month}-01`;
    // End boundary: next month
    const [y, m] = month.split("-").map(Number);
    const nextMonth =
      m === 12
        ? `${y + 1}-01`
        : `${y}-${String(m + 1).padStart(2, "0")}`;
    const nextMonthStart = `${nextMonth}-01`;

    const productData = await Promise.all(
      products.map(async (product) => {
        // All transactions for this product, ordered by date
        const allTxs = await ctx.db
          .query("transactions")
          .withIndex("by_product_date", (q) => q.eq("productId", product._id))
          .collect();

        // Transactions in the target month
        const monthTxs = allTxs
          .filter((tx) => tx.date >= monthStart && tx.date < nextMonthStart)
          .sort((a, b) => {
            const d = a.date.localeCompare(b.date);
            return d !== 0 ? d : a.createdAt - b.createdAt;
          });

        // Opening balance: stock at the beginning of the month
        const priorTxs = allTxs
          .filter((tx) => tx.date < monthStart)
          .sort((a, b) => {
            const d = b.date.localeCompare(a.date);
            return d !== 0 ? d : b.createdAt - a.createdAt;
          });

        let openingBalance: number;
        if (priorTxs.length > 0) {
          // Last transaction before this month = stock at month start
          openingBalance = priorTxs[0].runningBalance;
        } else if (monthTxs.length > 0) {
          // No prior txs: derive from the first tx of the month
          const first = monthTxs[0];
          openingBalance =
            first.type === "in"
              ? first.runningBalance - first.quantity
              : first.runningBalance + first.quantity;
        } else {
          // No transactions at all: current stock is the opening balance
          openingBalance = product.currentStock;
        }

        return { product, transactions: monthTxs, openingBalance };
      })
    );

    return {
      org,
      productData,
    };
  },
});

/** List all organizations (for cron). */
export const listAllOrganizations = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("organizations").collect();
  },
});
