/**
 * One-time migration: update role values and backfill transaction fields.
 *
 * Run from Convex dashboard → Functions → migrations:migrateRoles
 *
 * Migration steps:
 * 1. organizationMembers: admin → admin, member → employee, viewer → employee
 * 2. transactions: backfill createdAt from _creationTime where missing
 * 3. transactions: set source = "direct" where missing
 */
import { internalMutation } from "../_generated/server";

// Map old role values to new ones
const ROLE_MIGRATION: Record<string, string> = {
  admin: "admin",
  member: "employee",
  viewer: "employee",
  // New roles are unchanged
  employee: "employee",
  logistic: "logistic",
  manager: "manager",
  owner: "owner",
};

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    let membersUpdated = 0;
    let transactionsBackfilled = 0;

    // Step 1: Migrate organization member roles
    const allMembers = await ctx.db.query("organizationMembers").collect();
    for (const member of allMembers) {
      const newRole = ROLE_MIGRATION[member.role];
      if (newRole && newRole !== member.role) {
        await ctx.db.patch(member._id, { role: newRole as "employee" | "logistic" | "manager" | "owner" | "admin" });
        membersUpdated++;
      }
    }

    // Step 2 & 3: Backfill createdAt and source on transactions
    const allTransactions = await ctx.db.query("transactions").collect();
    for (const tx of allTransactions) {
      const updates: Record<string, unknown> = {};

      // Backfill createdAt from Convex's _creationTime
      if (!tx.createdAt) {
        updates.createdAt = tx._creationTime;
      }

      // Backfill source as "direct" for existing transactions
      if (!tx.source) {
        updates.source = "direct";
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(tx._id, updates);
        transactionsBackfilled++;
      }
    }

    return {
      membersUpdated,
      transactionsBackfilled,
      totalMembers: allMembers.length,
      totalTransactions: allTransactions.length,
    };
  },
});
