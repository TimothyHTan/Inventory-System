"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { scrypt as scryptCallback, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// Password hashing — matches @convex-dev/auth's Scrypt implementation (lucia)
// Format: "{hex_salt}:{hex_key}" where salt=16 bytes, key=64 bytes
// ---------------------------------------------------------------------------

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scryptCallback(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 16, p: 1 },
      (err, key) => {
        if (err) reject(err);
        else resolve(`${salt}:${key.toString("hex")}`);
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Actions (run in Node.js runtime — can do I/O like sending emails)
// ---------------------------------------------------------------------------

/** Request a password-reset OTP. Sends a 6-digit code to the user's email. */
export const requestPasswordReset = action({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // 1. Check the account exists (don't reveal if it doesn't)
    const account = await ctx.runQuery(
      internal.passwordReset.findAccountByEmail,
      { email }
    );
    if (!account) {
      // Silently succeed to avoid email enumeration
      return { success: true };
    }

    // 2. Rate-limit: max 3 requests per 15 minutes
    const recentCount = await ctx.runQuery(
      internal.passwordReset.checkRateLimit,
      { email }
    );
    if (recentCount >= 3) {
      throw new Error("Terlalu banyak permintaan. Coba lagi dalam 15 menit.");
    }

    // 3. Generate a 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    await ctx.runMutation(internal.passwordReset.storeOtp, {
      email,
      code,
      expiresAt,
    });

    // 4. Send OTP via Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"StockCard" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Kode Verifikasi Reset Password — StockCard",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #13110E; color: #F0EDE6; border-radius: 6px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #D4915C; transform: rotate(45deg); margin-bottom: 12px;"></div>
            <h2 style="color: #D4915C; font-size: 20px; margin: 0;">StockCard</h2>
          </div>
          <p style="color: #B0A999; font-size: 14px; margin-bottom: 20px;">
            Anda menerima email ini karena ada permintaan reset password untuk akun StockCard Anda.
          </p>
          <div style="background: #1C1915; border: 1px solid #3A3530; border-radius: 4px; padding: 24px; text-align: center; margin-bottom: 20px;">
            <p style="color: #88806F; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 10px 0;">Kode Verifikasi</p>
            <p style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #D4915C; font-family: 'Courier New', monospace; margin: 0;">${code}</p>
          </div>
          <p style="color: #88806F; font-size: 13px; margin-bottom: 8px;">
            Kode ini berlaku selama <strong style="color: #B0A999;">10 menit</strong>.
          </p>
          <div style="border-top: 1px solid #282420; margin-top: 24px; padding-top: 16px;">
            <p style="color: #5C5548; font-size: 11px; margin: 0;">
              Jika Anda tidak meminta reset password, abaikan email ini.
            </p>
          </div>
        </div>
      `,
    });

    return { success: true };
  },
});

/** Set a new password after successful OTP verification. */
export const resetPassword = action({
  args: {
    email: v.string(),
    resetToken: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { email, resetToken, newPassword }) => {
    if (newPassword.length < 8) {
      throw new Error("Password minimal 8 karakter.");
    }

    const hashedPassword = await hashPassword(newPassword);

    await ctx.runMutation(internal.passwordReset.updatePasswordHash, {
      email,
      resetToken,
      hashedPassword,
    });

    return { success: true };
  },
});
