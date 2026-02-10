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
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer")
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

  // ── Existing tables (with optional organizationId for migration) ──

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
    createdAt: v.number(),
    createdBy: v.optional(v.id("users")),
    organizationId: v.optional(v.id("organizations")),
  })
    .index("by_product", ["productId"])
    .index("by_product_date", ["productId", "date"])
    .index("by_org", ["organizationId"]),

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
});
