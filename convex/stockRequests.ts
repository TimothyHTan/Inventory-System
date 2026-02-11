import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getOrgMembership, requireMinRole, ROLE_TIER } from "./helpers";

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

    // Enrich with product name and requester name
    const enriched = await Promise.all(
      requests.map(async (r) => {
        const product = await ctx.db.get(r.productId);
        const requester = await ctx.db.get(r.requestedBy);
        const fulfiller = r.fulfilledBy
          ? await ctx.db.get(r.fulfilledBy)
          : null;
        return {
          ...r,
          productName: product?.name ?? "—",
          requesterName: requester?.name || requester?.email || "—",
          fulfillerName: fulfiller
            ? fulfiller.name || fulfiller.email || "—"
            : null,
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

    await ctx.db.patch(requestId, { status: "cancelled" });
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
