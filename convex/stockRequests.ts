import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getOrgMembership, requireMinRole, ROLE_TIER, displayName } from "./helpers";

// ── Queries ──────────────────────────────────────────────────────

/** List stock requests. logistic+ sees all; employee sees only their own. */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("fulfilled"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, { organizationId, status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membership = await getOrgMembership(ctx, userId, organizationId);
    if (!membership) return [];

    const isLogisticPlus =
      ROLE_TIER[membership.role] >= ROLE_TIER["logistic"];

    let requests;
    if (status) {
      requests = await ctx.db
        .query("stockRequests")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", organizationId).eq("status", status)
        )
        .order("desc")
        .collect();
    } else {
      requests = await ctx.db
        .query("stockRequests")
        .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
        .order("desc")
        .collect();
    }

    // Employee sees only their own requests
    if (!isLogisticPlus) {
      requests = requests.filter((r) => r.requestedBy === userId);
    }

    // Enrich with product name, requester name, fulfiller/canceller name
    const enriched = await Promise.all(
      requests.map(async (r) => {
        const product = await ctx.db.get(r.productId);
        const requester = await ctx.db.get(r.requestedBy);
        const fulfiller = r.fulfilledBy
          ? await ctx.db.get(r.fulfilledBy)
          : null;
        const canceller = r.cancelledBy
          ? await ctx.db.get(r.cancelledBy)
          : null;
        return {
          ...r,
          productName: product?.name ?? "—",
          requesterName: displayName(requester),
          fulfillerName: fulfiller ? displayName(fulfiller) : null,
          cancellerName: canceller ? displayName(canceller) : null,
        };
      })
    );

    return enriched;
  },
});

/** Employee's own requests only */
export const myRequests = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membership = await getOrgMembership(ctx, userId, organizationId);
    if (!membership) return [];

    const requests = await ctx.db
      .query("stockRequests")
      .withIndex("by_requester", (q) => q.eq("requestedBy", userId))
      .order("desc")
      .collect();

    // Filter to this org only
    const orgRequests = requests.filter(
      (r) => r.organizationId === organizationId
    );

    const enriched = await Promise.all(
      orgRequests.map(async (r) => {
        const product = await ctx.db.get(r.productId);
        return {
          ...r,
          productName: product?.name ?? "—",
        };
      })
    );

    return enriched;
  },
});

/** Count of pending requests for notification badge. logistic+ only. */
export const pendingCount = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const membership = await getOrgMembership(ctx, userId, organizationId);
    if (!membership || ROLE_TIER[membership.role] < ROLE_TIER["logistic"]) {
      return 0;
    }

    const pending = await ctx.db
      .query("stockRequests")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", organizationId).eq("status", "pending")
      )
      .collect();

    return pending.length;
  },
});

// ── Mutations ────────────────────────────────────────────────────

/** Employee submits a KELUAR stock request */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    productId: v.id("products"),
    quantity: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, productId, quantity, note }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    await requireMinRole(ctx, userId, organizationId, "employee");

    if (quantity <= 0) throw new Error("Jumlah harus lebih dari 0");

    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Produk tidak ditemukan");
    if (product.organizationId !== organizationId) {
      throw new Error("Produk tidak ditemukan dalam organisasi ini");
    }

    if (product.currentStock <= 0) {
      throw new Error("Barang ini habis, silakan melakukan restock terlebih dahulu.");
    }

    await ctx.db.insert("stockRequests", {
      organizationId,
      productId,
      requestedBy: userId,
      quantity,
      note: note?.trim() || undefined,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/** Cancel a pending request. Own request = any role. Others' requests = logistic+. */
export const cancel = mutation({
  args: { requestId: v.id("stockRequests") },
  handler: async (ctx, { requestId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Permintaan tidak ditemukan");

    if (request.status !== "pending") {
      throw new Error("Hanya permintaan yang menunggu yang dapat dibatalkan");
    }

    // Own request: anyone can cancel. Others' requests: logistic+ only.
    if (request.requestedBy !== userId) {
      await requireMinRole(ctx, userId, request.organizationId, "logistic");
    }

    await ctx.db.patch(requestId, {
      status: "cancelled",
      cancelledBy: userId,
      cancelledAt: Date.now(),
    });
  },
});

/** Logistic fulfills a pending request — creates KELUAR transaction atomically */
export const fulfill = mutation({
  args: { requestId: v.id("stockRequests") },
  handler: async (ctx, { requestId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Permintaan tidak ditemukan");

    await requireMinRole(ctx, userId, request.organizationId, "logistic");

    if (request.status !== "pending") {
      throw new Error("Permintaan ini sudah diproses");
    }

    const product = await ctx.db.get(request.productId);
    if (!product) throw new Error("Produk tidak ditemukan");

    if (product.currentStock < request.quantity) {
      throw new Error("Stok tidak mencukupi untuk memenuhi permintaan ini.");
    }

    const now = Date.now();
    const newBalance = product.currentStock - request.quantity;

    // Create KELUAR transaction
    const txId = await ctx.db.insert("transactions", {
      productId: request.productId,
      date: new Date().toISOString().split("T")[0],
      type: "out",
      quantity: request.quantity,
      description: request.note || "Permintaan stok keluar",
      runningBalance: newBalance,
      createdAt: now,
      createdBy: userId,
      organizationId: request.organizationId,
      source: "request",
    });

    // Deduct stock
    await ctx.db.patch(request.productId, {
      currentStock: newBalance,
      updatedAt: now,
    });

    // Mark request as fulfilled
    await ctx.db.patch(requestId, {
      status: "fulfilled",
      fulfilledBy: userId,
      fulfilledAt: now,
      transactionId: txId,
    });

    return { txId, newBalance };
  },
});

// ── Internal Mutations (called by cron, not exposed to client) ───

/** Delete fulfilled/cancelled stock requests older than 30 days */
export const cleanupOldRequests = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const fulfilled = await ctx.db
      .query("stockRequests")
      .filter((q) => q.eq(q.field("status"), "fulfilled"))
      .collect();

    const cancelled = await ctx.db
      .query("stockRequests")
      .filter((q) => q.eq(q.field("status"), "cancelled"))
      .collect();

    let deleted = 0;

    for (const request of [...fulfilled, ...cancelled]) {
      if (request.createdAt < thirtyDaysAgo) {
        await ctx.db.delete(request._id);
        deleted++;
      }
    }

    return { deleted };
  },
});

// ── Activity Feed Query ──────────────────────────────────────────

/** Recent activity feed for the dashboard. All org members can view. */
export const recentActivity = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membership = await getOrgMembership(ctx, userId, organizationId);
    if (!membership) return [];

    const maxItems = limit ?? 15;

    // Get recent stock requests (all statuses)
    const requests = await ctx.db
      .query("stockRequests")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(50);

    // Get recent MASUK transactions
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(50);

    const inboundTx = transactions.filter((tx) => tx.type === "in");

    // Build a user cache to avoid repeated lookups
    const userIds = new Set<string>();
    for (const r of requests) {
      userIds.add(r.requestedBy);
      if (r.fulfilledBy) userIds.add(r.fulfilledBy);
      if (r.cancelledBy) userIds.add(r.cancelledBy);
    }
    for (const tx of inboundTx) {
      if (tx.createdBy) userIds.add(tx.createdBy);
    }

    const userCache = new Map<string, { name?: string; email?: string }>();
    for (const id of userIds) {
      const user = await ctx.db.get(id as Id<"users">);
      if (user) userCache.set(id, { name: user.name, email: user.email });
    }

    const getUserName = (id: string | undefined) => {
      if (!id) return "—";
      const u = userCache.get(id);
      return displayName(u ?? null);
    };

    const activities: Array<{
      type: "request_created" | "request_fulfilled" | "request_cancelled" | "masuk_recorded";
      timestamp: number;
      userName: string;
      productName: string;
      quantity: number;
      note?: string;
    }> = [];

    // Process stock requests into activity events
    for (const r of requests) {
      const product = await ctx.db.get(r.productId);
      const productName = product?.name ?? "—";

      // "Created" event
      activities.push({
        type: "request_created",
        timestamp: r.createdAt,
        userName: getUserName(r.requestedBy),
        productName,
        quantity: r.quantity,
        note: r.note,
      });

      // "Fulfilled" event
      if (r.status === "fulfilled" && r.fulfilledBy && r.fulfilledAt) {
        activities.push({
          type: "request_fulfilled",
          timestamp: r.fulfilledAt,
          userName: getUserName(r.fulfilledBy),
          productName,
          quantity: r.quantity,
        });
      }

      // "Cancelled" event
      if (r.status === "cancelled" && r.cancelledBy && r.cancelledAt) {
        activities.push({
          type: "request_cancelled",
          timestamp: r.cancelledAt,
          userName: getUserName(r.cancelledBy),
          productName,
          quantity: r.quantity,
        });
      }
    }

    // Process MASUK transactions
    for (const tx of inboundTx) {
      const product = await ctx.db.get(tx.productId);
      activities.push({
        type: "masuk_recorded",
        timestamp: tx.createdAt,
        userName: getUserName(tx.createdBy),
        productName: product?.name ?? "—",
        quantity: tx.quantity,
        note: tx.description,
      });
    }

    // Sort by timestamp desc, take top N
    activities.sort((a, b) => b.timestamp - a.timestamp);
    return activities.slice(0, maxItems);
  },
});
