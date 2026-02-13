import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  // Override users table to include role field
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneNumberVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    // Legacy global role — org-scoped roles are in organizationMembers
    role: v.optional(v.union(v.literal("admin"), v.literal("staff"))),
    // Pending display name change (awaiting manager+ approval)
    pendingName: v.optional(v.string()),
  }),

  // ── Multi-tenancy tables ──────────────────────────────────────

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_creator", ["createdBy"]),

  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("employee"),
      v.literal("logistic"),
      v.literal("manager"),
      v.literal("owner"),
      v.literal("admin")
    ),
    joinedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"]),

  invites: defineTable({
    organizationId: v.id("organizations"),
    code: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    uses: v.number(),
    revoked: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_org", ["organizationId"]),

  // ── Core data tables (org-scoped) ─────────────────────────────
  // organizationId is optional in schema for backward compatibility with
  // pre-migration data, but all mutations always set it and all queries
  // always enforce org membership — so data without an org is inaccessible.

  products: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    currentStock: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    organizationId: v.optional(v.id("organizations")),
  })
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["organizationId"],
    })
    .index("by_org", ["organizationId"]),

  transactions: defineTable({
    productId: v.id("products"),
    date: v.string(), // "2026-01-15" business date
    type: v.union(v.literal("in"), v.literal("out")),
    quantity: v.number(),
    description: v.string(), // customer/supplier name (KETERANGAN)
    runningBalance: v.number(), // SISA — snapshot at time of transaction
    createdAt: v.number(), // system timestamp for 60-min delete window
    createdBy: v.optional(v.id("users")),
    organizationId: v.optional(v.id("organizations")),
    source: v.optional(
      v.union(
        v.literal("direct"), // manually added MASUK by logistic
        v.literal("request") // auto-created KELUAR from a fulfilled stock request
      )
    ),
  })
    .index("by_product", ["productId"])
    .index("by_product_date", ["productId", "date"])
    .index("by_org", ["organizationId"])
    .index("by_org_date", ["organizationId", "date"]),

  // ── Stock Requests (KELUAR flow only) ─────────────────────────

  stockRequests: defineTable({
    organizationId: v.id("organizations"),
    productId: v.id("products"),
    requestedBy: v.id("users"),
    quantity: v.number(),
    note: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("fulfilled"),
      v.literal("cancelled")
    ),
    fulfilledBy: v.optional(v.id("users")),
    fulfilledAt: v.optional(v.number()),
    transactionId: v.optional(v.id("transactions")),
    cancelledBy: v.optional(v.id("users")),
    cancelledAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_requester", ["requestedBy"]),

  passwordResetOtps: defineTable({
    email: v.string(),
    code: v.string(),
    resetToken: v.optional(v.string()),
    expiresAt: v.number(),
    verifiedAt: v.optional(v.number()),
    used: v.boolean(),
    attempts: v.number(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // ── Monthly Excel reports (stored on Cloudflare R2) ─────────────

  reports: defineTable({
    organizationId: v.id("organizations"),
    month: v.string(), // "2026-01" format
    status: v.union(
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    ),
    fileKey: v.optional(v.string()), // R2 object key
    fileUrl: v.optional(v.string()), // public download URL
    fileSize: v.optional(v.number()),
    productCount: v.optional(v.number()),
    transactionCount: v.optional(v.number()),
    productId: v.optional(v.id("products")), // if set, single-product report
    productName: v.optional(v.string()), // snapshot of product name at generation
    generatedBy: v.optional(v.id("users")), // null = cron-triggered
    generatedAt: v.optional(v.number()), // when generation completed/failed
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_month", ["organizationId", "month"]),
});
