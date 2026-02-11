import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getOrgMembership,
  requireMinRole,
  ROLE_TIER,
  generateSlug,
  generateInviteCode,
} from "./helpers";

// ── Queries ──────────────────────────────────────────────────────

/** List all organizations the current user belongs to */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const orgs = await Promise.all(
      memberships.map(async (m) => {
        const org = await ctx.db.get(m.organizationId);
        return org ? { ...org, role: m.role } : null;
      })
    );

    return orgs.filter(Boolean);
  },
});

/** Get an organization by slug, including membership info for current user */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (!org) return null;

    const membership = await getOrgMembership(ctx, userId, org._id);
    if (!membership) return null;

    return { org, membership };
  },
});

/** List members of an organization (any member can view) */
export const getMembers = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membership = await getOrgMembership(ctx, userId, organizationId);
    if (!membership) return [];

    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    const membersWithUser = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          ...m,
          userName: user?.name || null,
          userEmail: user?.email || null,
        };
      })
    );

    return membersWithUser;
  },
});

/** List invites for an organization (owner+ only) */
export const getInvites = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membership = await getOrgMembership(ctx, userId, organizationId);
    if (!membership || ROLE_TIER[membership.role] < ROLE_TIER["owner"]) return [];

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    const invitesWithCreator = await Promise.all(
      invites.map(async (inv) => {
        const creator = await ctx.db.get(inv.createdBy);
        return {
          ...inv,
          creatorName: creator?.name || creator?.email || "Unknown",
        };
      })
    );

    return invitesWithCreator;
  },
});

/** Get invite details by code (for the accept-invite page) */
export const getInviteByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (!invite) return null;
    if (invite.revoked) return null;
    if (invite.expiresAt && invite.expiresAt < Date.now()) return null;
    if (invite.maxUses && invite.uses >= invite.maxUses) return null;

    const org = await ctx.db.get(invite.organizationId);
    if (!org) return null;

    // Check if user is already a member
    const existing = await getOrgMembership(ctx, userId, invite.organizationId);

    return {
      orgName: org.name,
      orgSlug: org.slug,
      alreadyMember: !!existing,
    };
  },
});

// ── Mutations ────────────────────────────────────────────────────

/** Create a new organization (current user becomes admin) */
export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Nama organisasi harus diisi");

    // Generate unique slug
    let slug = generateSlug(trimmedName);
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existing) {
      // Append random suffix
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${suffix}`;
    }

    const now = Date.now();

    const orgId = await ctx.db.insert("organizations", {
      name: trimmedName,
      slug,
      createdBy: userId,
      createdAt: now,
    });

    // Creator becomes owner
    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      userId,
      role: "owner",
      joinedAt: now,
    });

    return { orgId, slug };
  },
});

/** Update organization details (owner+ only) */
export const update = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    await requireMinRole(ctx, userId, organizationId, "owner");

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Nama organisasi harus diisi");
      await ctx.db.patch(organizationId, { name: trimmedName });
    }
  },
});

/** Delete organization and all its data (owner+ only) */
export const remove = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    await requireMinRole(ctx, userId, organizationId, "owner");

    // Delete all org data
    const products = await ctx.db
      .query("products")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    for (const product of products) {
      const txs = await ctx.db
        .query("transactions")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .collect();
      for (const tx of txs) {
        await ctx.db.delete(tx._id);
      }
      await ctx.db.delete(product._id);
    }

    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
    for (const inv of invites) {
      await ctx.db.delete(inv._id);
    }

    // Delete stock requests
    const stockRequests = await ctx.db
      .query("stockRequests")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
    for (const sr of stockRequests) {
      await ctx.db.delete(sr._id);
    }

    await ctx.db.delete(organizationId);
  },
});

/** Update a member's role (owner+ can change, admin role assignable only by admin) */
export const updateMemberRole = mutation({
  args: {
    memberId: v.id("organizationMembers"),
    role: v.union(
      v.literal("employee"),
      v.literal("logistic"),
      v.literal("manager"),
      v.literal("owner"),
      v.literal("admin")
    ),
  },
  handler: async (ctx, { memberId, role }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    const member = await ctx.db.get(memberId);
    if (!member) throw new Error("Anggota tidak ditemukan");

    const currentUserMembership = await requireMinRole(
      ctx,
      userId,
      member.organizationId,
      "owner"
    );

    if (member.userId === userId) {
      throw new Error("Tidak bisa mengubah role sendiri");
    }

    // Only admin can assign admin role
    if (role === "admin" && currentUserMembership.role !== "admin") {
      throw new Error("Hanya Admin yang dapat menetapkan role Admin");
    }

    // Prevent demotion if this is the last owner/admin
    if (
      (member.role === "owner" || member.role === "admin") &&
      ROLE_TIER[role] < ROLE_TIER[member.role]
    ) {
      const allMembers = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org", (q) =>
          q.eq("organizationId", member.organizationId)
        )
        .collect();
      const highRoleCount = allMembers.filter(
        (m) => m.role === "owner" || m.role === "admin"
      ).length;
      if (highRoleCount <= 1) {
        throw new Error(
          "Tidak bisa menurunkan role — setidaknya harus ada satu Pemilik atau Admin."
        );
      }
    }

    await ctx.db.patch(memberId, { role });
  },
});

/** Remove a member from org (owner+ only, can't remove self) */
export const removeMember = mutation({
  args: { memberId: v.id("organizationMembers") },
  handler: async (ctx, { memberId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    const member = await ctx.db.get(memberId);
    if (!member) throw new Error("Anggota tidak ditemukan");

    await requireMinRole(ctx, userId, member.organizationId, "owner");

    if (member.userId === userId) {
      throw new Error("Tidak bisa menghapus diri sendiri");
    }

    await ctx.db.delete(memberId);
  },
});

/** Leave an organization (any member, but last admin can't leave) */
export const leave = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    const membership = await getOrgMembership(ctx, userId, organizationId);
    if (!membership) throw new Error("Bukan anggota organisasi ini");

    // If owner or admin, check that there's at least one other owner/admin
    if (membership.role === "owner" || membership.role === "admin") {
      const allMembers = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
        .collect();
      const highRoleCount = allMembers.filter(
        (m) => m.role === "owner" || m.role === "admin"
      ).length;
      if (highRoleCount <= 1) {
        throw new Error(
          "Tidak bisa keluar — Anda satu-satunya Pemilik/Admin. Angkat Pemilik lain terlebih dahulu."
        );
      }
    }

    await ctx.db.delete(membership._id);
  },
});

// ── Invite System ────────────────────────────────────────────────

/** Create an invite code (owner+ only) */
export const createInvite = mutation({
  args: {
    organizationId: v.id("organizations"),
    maxUses: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, maxUses }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    await requireMinRole(ctx, userId, organizationId, "owner");

    const code = generateInviteCode();

    await ctx.db.insert("invites", {
      organizationId,
      code,
      createdBy: userId,
      createdAt: Date.now(),
      maxUses,
      uses: 0,
      revoked: false,
    });

    return code;
  },
});

/** Revoke an invite code (admin only) */
export const revokeInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Undangan tidak ditemukan");

    await requireMinRole(ctx, userId, invite.organizationId, "owner");

    await ctx.db.patch(inviteId, { revoked: true });
  },
});

/** Accept an invite code (any authenticated user) */
export const acceptInvite = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (!invite) throw new Error("Kode undangan tidak valid");
    if (invite.revoked) throw new Error("Kode undangan sudah dicabut");
    if (invite.expiresAt && invite.expiresAt < Date.now()) {
      throw new Error("Kode undangan sudah kedaluwarsa");
    }
    if (invite.maxUses && invite.uses >= invite.maxUses) {
      throw new Error("Kode undangan sudah mencapai batas penggunaan");
    }

    // Check if already a member
    const existing = await getOrgMembership(
      ctx,
      userId,
      invite.organizationId
    );
    if (existing) {
      throw new Error("Anda sudah menjadi anggota organisasi ini");
    }

    // Add as employee (lowest tier — owner promotes as needed)
    await ctx.db.insert("organizationMembers", {
      organizationId: invite.organizationId,
      userId,
      role: "employee",
      joinedAt: Date.now(),
    });

    // Increment usage count
    await ctx.db.patch(invite._id, { uses: invite.uses + 1 });

    // Return org slug for redirect
    const org = await ctx.db.get(invite.organizationId);
    return { slug: org?.slug ?? "" };
  },
});

// ── Migration ────────────────────────────────────────────────────

/** Check if there is unassigned data that needs migration */
export const needsMigration = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    // Check for products without organizationId
    const unassignedProduct = await ctx.db
      .query("products")
      .withIndex("by_org", (q) => q.eq("organizationId", undefined))
      .first();

    return !!unassignedProduct;
  },
});

/** Migrate existing data to the current organization */
export const migrate = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tidak terautentikasi");

    await requireMinRole(ctx, userId, organizationId, "owner");

    // Find unassigned products and assign them
    const products = await ctx.db
      .query("products")
      .withIndex("by_org", (q) => q.eq("organizationId", undefined))
      .collect();

    if (products.length === 0) {
      return { migrated: 0 };
    }

    let migrated = 0;

    for (const product of products) {
      await ctx.db.patch(product._id, { organizationId });

      // Also assign related transactions
      const txs = await ctx.db
        .query("transactions")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .collect();
      for (const tx of txs) {
        if (!tx.organizationId) {
          await ctx.db.patch(tx._id, { organizationId });
        }
      }
      migrated++;
    }

    // Also assign any remaining orphaned transactions
    const orphanedTxs = await ctx.db
      .query("transactions")
      .withIndex("by_org", (q) => q.eq("organizationId", undefined))
      .collect();
    for (const tx of orphanedTxs) {
      await ctx.db.patch(tx._id, { organizationId });
    }

    return { migrated };
  },
});
