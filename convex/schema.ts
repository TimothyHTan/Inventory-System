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
    // Custom field for role-based access
    role: v.optional(v.union(v.literal("admin"), v.literal("staff"))),
  }),

  products: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    currentStock: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).searchIndex("search_name", {
    searchField: "name",
  }),

  transactions: defineTable({
    productId: v.id("products"),
    date: v.string(), // "2026-01-15" business date
    type: v.union(v.literal("in"), v.literal("out")),
    quantity: v.number(),
    description: v.string(), // customer/supplier name (KETERANGAN)
    runningBalance: v.number(), // SISA — snapshot at time of transaction
    createdAt: v.number(),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_product", ["productId"])
    .index("by_product_date", ["productId", "date"]),

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
