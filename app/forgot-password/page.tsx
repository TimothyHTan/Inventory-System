"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { validatePassword } from "@/lib/utils";
import Link from "next/link";

type Step = "email" | "otp" | "newPassword" | "success";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>("email");

  // Form state
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP countdown (10 minutes = 600 seconds)
  const [countdown, setCountdown] = useState(600);
  const [canResend, setCanResend] = useState(false);

  // OTP input refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Convex functions
  const requestPasswordReset = useAction(
    api.passwordResetActions.requestPasswordReset
  );
  const verifyOtpMutation = useMutation(api.passwordReset.verifyOtp);
  const resetPasswordAction = useAction(
    api.passwordResetActions.resetPassword
  );

  // ---------------------------------------------------------------------------
  // Countdown timer for OTP expiration
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** Step 1: Send OTP to email */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset({ email: email.trim().toLowerCase() });
      setCountdown(600);
      setCanResend(false);
      setStep("otp");
      // Focus first OTP input after transition
      setTimeout(() => otpRefs.current[0]?.focus(), 350);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengirim kode. Coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  /** Resend OTP */
  const handleResendOtp = async () => {
    setError("");
    setOtp(["", "", "", "", "", ""]);
    setLoading(true);
    try {
      await requestPasswordReset({ email: email.trim().toLowerCase() });
      setCountdown(600);
      setCanResend(false);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengirim ulang kode."
      );
    } finally {
      setLoading(false);
    }
  };

  /** OTP digit input handlers */
  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      // Only allow digits
      const digit = value.replace(/\D/g, "").slice(-1);
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      // Auto-advance to next input
      if (digit && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  const handleOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  const handleOtpPaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (pasted.length === 0) return;

      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || "";
      }
      setOtp(newOtp);

      // Focus the input after the last pasted digit
      const focusIndex = Math.min(pasted.length, 5);
      otpRefs.current[focusIndex]?.focus();
    },
    [otp]
  );

  /** Step 2: Verify OTP */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Masukkan 6 digit kode OTP.");
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtpMutation({
        email: email.trim().toLowerCase(),
        code,
      });
      setResetToken(result.resetToken);
      setStep("newPassword");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Verifikasi gagal. Coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  /** Step 3: Set new password */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordAction({
        email: email.trim().toLowerCase(),
        resetToken,
        newPassword,
      });
      setStep("success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengubah password."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step indicator
  // ---------------------------------------------------------------------------
  const stepIndex = { email: 0, otp: 1, newPassword: 2, success: 2 }[step];

  function StepIndicator() {
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i <= stepIndex
                  ? "bg-copper scale-100"
                  : "bg-carbon-600 scale-75"
              }`}
            />
            {i < 2 && (
              <div
                className={`w-6 h-px transition-colors duration-300 ${
                  i < stepIndex ? "bg-copper/60" : "bg-carbon-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Decorative corner marks */}
      <div className="fixed top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-carbon-700/30" />
      <div className="fixed top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-carbon-700/30" />
      <div className="fixed bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-carbon-700/30" />
      <div className="fixed bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-carbon-700/30" />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-8 h-8 rotate-45 border-2 border-copper flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-copper" />
            </div>
          </div>
          <h1 className="font-display text-3xl text-carbon-50 mb-1">
            StockCard
          </h1>
          <p className="stencil text-carbon-400">Sistem Inventaris Digital</p>
        </div>

        {/* Form card */}
        <div className="card p-6 overflow-hidden">
          <StepIndicator />

          <AnimatePresence mode="wait">
            {/* ============================================================= */}
            {/* STEP 1: Email input                                           */}
            {/* ============================================================= */}
            {step === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="text-center mb-5">
                  {/* Lock icon */}
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-copper/8 border border-copper/20 mb-3">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      className="text-copper"
                    >
                      <rect
                        x="3"
                        y="8"
                        width="12"
                        height="8"
                        rx="1.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M6 8V5.5a3 3 0 116 0V8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <h2 className="text-sm font-medium text-carbon-50 uppercase tracking-wider">
                    Lupa Password?
                  </h2>
                  <p className="text-xs text-carbon-400 mt-1">
                    Masukkan email akun Anda untuk menerima kode OTP
                  </p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@perusahaan.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-rust bg-rust/8 border border-rust/20 rounded-sm px-3 py-2"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button type="submit" loading={loading} className="w-full">
                    Kirim Kode OTP
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <Link
                    href="/login"
                    className="text-xs text-carbon-400 hover:text-copper transition-colors"
                  >
                    &larr; Kembali ke Login
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ============================================================= */}
            {/* STEP 2: OTP verification                                      */}
            {/* ============================================================= */}
            {step === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="text-center mb-5">
                  {/* Mail icon */}
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-copper/8 border border-copper/20 mb-3">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      className="text-copper"
                    >
                      <rect
                        x="2"
                        y="4"
                        width="14"
                        height="10"
                        rx="1.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M2 6l7 4.5L16 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h2 className="text-sm font-medium text-carbon-50 uppercase tracking-wider">
                    Verifikasi Kode
                  </h2>
                  <p className="text-xs text-carbon-400 mt-1">
                    Kode dikirim ke{" "}
                    <span className="text-carbon-200 font-mono">
                      {maskEmail(email)}
                    </span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  {/* 6-digit OTP input boxes */}
                  <div className="flex gap-2 justify-center">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          otpRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        className={`w-11 h-13 text-center text-lg font-mono bg-carbon-800 border rounded-sm text-carbon-50 transition-all duration-150 outline-none ${
                          digit
                            ? "border-copper/50 ring-1 ring-copper/20"
                            : "border-carbon-600/40 focus:border-copper/50 focus:ring-1 focus:ring-copper/20"
                        }`}
                        aria-label={`Digit ${i + 1}`}
                      />
                    ))}
                  </div>

                  {/* Countdown timer */}
                  <div className="text-center">
                    {countdown > 0 ? (
                      <p className="text-xs text-carbon-400">
                        Berlaku{" "}
                        <span className="font-mono text-copper">
                          {formattedTime}
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-rust">
                        Kode sudah kedaluwarsa
                      </p>
                    )}
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-rust bg-rust/8 border border-rust/20 rounded-sm px-3 py-2"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    loading={loading}
                    disabled={countdown === 0}
                    className="w-full"
                  >
                    Verifikasi
                  </Button>
                </form>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setError("");
                      setOtp(["", "", "", "", "", ""]);
                    }}
                    className="text-xs text-carbon-400 hover:text-carbon-200 transition-colors"
                  >
                    &larr; Ganti email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={!canResend || loading}
                    className={`text-xs transition-colors ${
                      canResend
                        ? "text-copper hover:text-copper-300 cursor-pointer"
                        : "text-carbon-500 cursor-not-allowed"
                    }`}
                  >
                    Kirim ulang kode
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============================================================= */}
            {/* STEP 3: New password                                          */}
            {/* ============================================================= */}
            {step === "newPassword" && (
              <motion.div
                key="newPassword"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="text-center mb-5">
                  {/* Key icon */}
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-copper/8 border border-copper/20 mb-3">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      className="text-copper"
                    >
                      <circle
                        cx="7"
                        cy="7"
                        r="3.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M10 10l5.5 5.5M13 13l2 -2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <h2 className="text-sm font-medium text-carbon-50 uppercase tracking-wider">
                    Password Baru
                  </h2>
                  <p className="text-xs text-carbon-400 mt-1">
                    Buat password baru untuk akun Anda
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <Input
                    label="Password Baru"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8-16 karakter, huruf & angka"
                    required
                    autoComplete="new-password"
                    autoFocus
                  />
                  <Input
                    label="Konfirmasi Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    required
                    autoComplete="new-password"
                  />

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-rust bg-rust/8 border border-rust/20 rounded-sm px-3 py-2"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button type="submit" loading={loading} className="w-full">
                    Simpan Password
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ============================================================= */}
            {/* STEP 4: Success                                               */}
            {/* ============================================================= */}
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-center py-4"
              >
                {/* Animated checkmark */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.1,
                  }}
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sage/12 border border-sage/30 mb-4"
                >
                  <motion.svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-sage"
                  >
                    <motion.path
                      d="M6 12l4.5 4.5L18 8"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: 0.25 }}
                    />
                  </motion.svg>
                </motion.div>

                <h2 className="text-sm font-medium text-carbon-50 uppercase tracking-wider mb-1">
                  Password Berhasil Diubah
                </h2>
                <p className="text-xs text-carbon-400 mb-6">
                  Silakan masuk dengan password baru Anda
                </p>

                <Button
                  onClick={() => router.push("/login")}
                  className="w-full"
                >
                  Masuk ke Akun
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-carbon-500 mt-6 font-mono uppercase tracking-wider">
          Kartu Stock Digital &middot; v1.0
        </p>
      </div>
    </div>
  );
}
