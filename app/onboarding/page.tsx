"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

type Step = "choose" | "create" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const user = useQuery(api.users.current);
  const orgs = useQuery(api.organizations.list);

  const createOrg = useMutation(api.organizations.create);
  const acceptInvite = useMutation(api.organizations.acceptInvite);

  const [step, setStep] = useState<Step>("choose");
  const [orgName, setOrgName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // If user already has orgs, redirect to the first one
  useEffect(() => {
    if (orgs && orgs.length > 0 && step === "choose") {
      const firstOrg = orgs[0];
      if (firstOrg) {
        router.push(`/org/${firstOrg.slug}/dashboard`);
      }
    }
  }, [orgs, step, router]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = orgName.trim();
    if (!trimmed) {
      setError("Nama organisasi harus diisi");
      return;
    }

    if (trimmed.length < 3) {
      setError("Nama organisasi minimal 3 karakter");
      return;
    }

    setLoading(true);
    try {
      const result = await createOrg({ name: trimmed });
      router.push(`/org/${result.slug}/dashboard`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message.toLowerCase() : "";

      if (
        message.includes("already") ||
        message.includes("exists") ||
        message.includes("duplicate") ||
        message.includes("slug")
      ) {
        setError(
          `Organisasi "${trimmed}" sudah ada. Gunakan nama lain.`
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Gagal membuat organisasi. Coba lagi."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setError("Kode undangan harus diisi");
      return;
    }

    if (code.length !== 8) {
      setError("Kode undangan harus 8 karakter");
      return;
    }

    setLoading(true);
    try {
      const result = await acceptInvite({ code });
      router.push(`/org/${result.slug}/dashboard`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message.toLowerCase() : "";

      if (message.includes("already") || message.includes("sudah")) {
        setError("Anda sudah menjadi anggota organisasi ini.");
      } else if (
        message.includes("revoked") ||
        message.includes("dicabut")
      ) {
        setError("Kode undangan sudah dicabut oleh admin.");
      } else if (
        message.includes("expired") ||
        message.includes("kedaluwarsa")
      ) {
        setError("Kode undangan sudah kedaluwarsa.");
      } else if (message.includes("max") || message.includes("batas")) {
        setError("Kode undangan sudah mencapai batas penggunaan.");
      } else if (message.includes("invalid") || message.includes("tidak")) {
        setError(`Kode "${code}" tidak valid. Periksa kembali.`);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Gagal bergabung. Periksa kode undangan."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Decorative corner marks */}
      <div className="fixed top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-carbon-700/30" />
      <div className="fixed top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-carbon-700/30" />
      <div className="fixed bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-carbon-700/30" />
      <div className="fixed bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-carbon-700/30" />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-8 h-8 rotate-45 border-2 border-copper flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-copper" />
            </div>
          </div>
          <h1 className="font-display text-3xl text-carbon-50 mb-1">
            Selamat Datang
          </h1>
          <p className="text-sm text-carbon-400">
            {user?.name ? `Halo, ${user.name}!` : "Halo!"} Mulai dengan
            membuat atau bergabung ke organisasi.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step: Choose ──────────────────────────────── */}
          {step === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Create new org option */}
              <button
                onClick={() => setStep("create")}
                className="w-full card card-hover p-5 text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-sm bg-copper/10 border border-copper/20 flex items-center justify-center flex-shrink-0 group-hover:bg-copper/15 transition-colors">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      className="text-copper"
                    >
                      <path
                        d="M9 4v10M4 9h10"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-carbon-50 group-hover:text-copper transition-colors">
                      Buat Organisasi Baru
                    </h3>
                    <p className="text-xs text-carbon-400 mt-1">
                      Buat workspace baru dan undang tim Anda.
                      Anda akan menjadi admin.
                    </p>
                  </div>
                </div>
              </button>

              {/* Join existing org option */}
              <button
                onClick={() => setStep("join")}
                className="w-full card card-hover p-5 text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-sm bg-sage/10 border border-sage/20 flex items-center justify-center flex-shrink-0 group-hover:bg-sage/15 transition-colors">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      className="text-sage"
                    >
                      <path
                        d="M12 6l-6 6M12 6v5M12 6H7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-carbon-50 group-hover:text-sage transition-colors">
                      Bergabung dengan Kode Undangan
                    </h3>
                    <p className="text-xs text-carbon-400 mt-1">
                      Masukkan kode undangan dari admin organisasi
                      yang sudah ada.
                    </p>
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          {/* ── Step: Create ─────────────────────────────── */}
          {step === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <button
                    onClick={() => {
                      setStep("choose");
                      setError("");
                    }}
                    className="text-carbon-400 hover:text-carbon-100 transition-colors"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M10 4L6 8l4 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <h2 className="text-sm font-medium text-carbon-50 uppercase tracking-wider">
                    Buat Organisasi
                  </h2>
                </div>

                <form onSubmit={handleCreateOrg} className="space-y-4">
                  <Input
                    label="Nama Organisasi"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Contoh: PT Distribusi Jaya"
                    autoFocus
                    required
                  />

                  <p className="text-[10px] text-carbon-500">
                    Nama ini akan terlihat oleh semua anggota organisasi.
                  </p>

                  {error && (
                    <div className="text-xs text-rust bg-rust/8 border border-rust/20 rounded-sm px-3 py-2">
                      {error}
                    </div>
                  )}

                  <Button type="submit" loading={loading} className="w-full">
                    Buat Organisasi
                  </Button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ── Step: Join ───────────────────────────────── */}
          {step === "join" && (
            <motion.div
              key="join"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <button
                    onClick={() => {
                      setStep("choose");
                      setError("");
                    }}
                    className="text-carbon-400 hover:text-carbon-100 transition-colors"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M10 4L6 8l4 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <h2 className="text-sm font-medium text-carbon-50 uppercase tracking-wider">
                    Bergabung
                  </h2>
                </div>

                <form onSubmit={handleJoinOrg} className="space-y-4">
                  <Input
                    label="Kode Undangan"
                    type="text"
                    value={inviteCode}
                    onChange={(e) =>
                      setInviteCode(e.target.value.toUpperCase())
                    }
                    placeholder="Contoh: ABCD1234"
                    autoFocus
                    required
                    className="font-mono tracking-[0.15em] text-center text-lg"
                  />

                  <p className="text-[10px] text-carbon-500">
                    Minta kode undangan dari admin organisasi yang ingin Anda
                    ikuti.
                  </p>

                  {error && (
                    <div className="text-xs text-rust bg-rust/8 border border-rust/20 rounded-sm px-3 py-2">
                      {error}
                    </div>
                  )}

                  <Button type="submit" loading={loading} className="w-full">
                    Bergabung
                  </Button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <p className="text-center text-[10px] text-carbon-500 mt-6 font-mono uppercase tracking-wider">
          Kartu Stock Digital &middot; v2.0
        </p>
      </div>
    </div>
  );
}
