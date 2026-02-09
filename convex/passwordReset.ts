import { v } from "convex/values";
import { mutation, internalMutation, internalQuery } from "./_generated/server";

// ---------------------------------------------------------------------------
// Internal helpers (called from actions, not exposed to frontend)
// ---------------------------------------------------------------------------

/** Look up an auth account by email (password provider) */
export const findAccountByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .unique();
  },
});

/** Count recent OTP requests for rate-limiting (max 3 per 15 min) */
export const checkRateLimit = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    const recent = await ctx.db
      .query("passwordResetOtps")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    return recent.filter((otp) => otp.createdAt > fifteenMinutesAgo).length;
  },
});

/** Store a new OTP, replacing any existing one for that email */
export const storeOtp = internalMutation({
  args: {
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, { email, code, expiresAt }) => {
    // Remove old OTPs for this email
    const existing = await ctx.db
      .query("passwordResetOtps")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    for (const otp of existing) {
      await ctx.db.delete(otp._id);
    }

    await ctx.db.insert("passwordResetOtps", {
      email,
      code,
      expiresAt,
      used: false,
      attempts: 0,
      createdAt: Date.now(),
    });
  },
});

/** Update password hash in authAccounts (called after OTP verification) */
export const updatePasswordHash = internalMutation({
  args: {
    email: v.string(),
    resetToken: v.string(),
    hashedPassword: v.string(),
  },
  handler: async (ctx, { email, resetToken, hashedPassword }) => {
    // Verify reset token
    const otpRecord = await ctx.db
      .query("passwordResetOtps")
      .withIndex("by_email", (q) => q.eq("email", email))
      .order("desc")
      .first();

    if (!otpRecord || otpRecord.resetToken !== resetToken) {
      throw new Error("Token reset tidak valid.");
    }
    if (!otpRecord.verifiedAt) {
      throw new Error("OTP belum diverifikasi.");
    }
    if (Date.now() - otpRecord.verifiedAt > 15 * 60 * 1000) {
      throw new Error("Sesi reset sudah kedaluwarsa. Silakan ulangi proses.");
    }
    if (otpRecord.used) {
      throw new Error("Token reset sudah digunakan.");
    }

    // Update password in authAccounts
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .unique();

    if (!account) {
      throw new Error("Akun tidak ditemukan.");
    }

    await ctx.db.patch(account._id, { secret: hashedPassword });
    await ctx.db.patch(otpRecord._id, { used: true });
  },
});

// ---------------------------------------------------------------------------
// Public mutation — called directly from the frontend
// ---------------------------------------------------------------------------

/** Verify a 6-digit OTP code entered by the user */
export const verifyOtp = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, { email, code }) => {
    const otpRecord = await ctx.db
      .query("passwordResetOtps")
      .withIndex("by_email", (q) => q.eq("email", email))
      .order("desc")
      .first();

    if (!otpRecord) {
      throw new Error("Kode OTP tidak ditemukan. Silakan minta kode baru.");
    }
    if (otpRecord.used) {
      throw new Error("Kode OTP sudah digunakan. Silakan minta kode baru.");
    }
    if (Date.now() > otpRecord.expiresAt) {
      throw new Error("Kode OTP sudah kedaluwarsa. Silakan minta kode baru.");
    }
    if (otpRecord.attempts >= 5) {
      throw new Error("Terlalu banyak percobaan. Silakan minta kode baru.");
    }
    if (otpRecord.code !== code) {
      await ctx.db.patch(otpRecord._id, {
        attempts: otpRecord.attempts + 1,
      });
      throw new Error("Kode OTP salah. Silakan coba lagi.");
    }

    // OTP is valid — generate a single-use reset token
    const resetToken = crypto.randomUUID();

    await ctx.db.patch(otpRecord._id, {
      resetToken,
      verifiedAt: Date.now(),
    });

    return { resetToken };
  },
});
