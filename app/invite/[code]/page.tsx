"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { motion } from "motion/react";
import Link from "next/link";

export default function InvitePage() {
  const params = useParams();
  const code = params.code as string;
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const invite = useQuery(
    api.organizations.getInviteByCode,
    isAuthenticated ? { code } : "skip"
  );
  const acceptInvite = useMutation(api.organizations.acceptInvite);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [joinedSlug, setJoinedSlug] = useState("");

  // Redirect to login if not authenticated (with return URL)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login`);
    }
  }, [isAuthenticated, authLoading, router]);

  const handleAccept = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await acceptInvite({ code });
      setJoined(true);
      setJoinedSlug(result.slug);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal bergabung"
      );
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

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-8 h-8 rotate-45 border-2 border-copper flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-copper" />
            </div>
          </div>
        </div>

        {/* ── Success state ─────────────────────────────── */}
        {joined ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-12 h-12 rounded-full bg-sage/15 border border-sage/30 flex items-center justify-center mx-auto mb-4"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="text-sage"
              >
                <path
                  d="M5 10l3.5 3.5L15 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>

            <h2 className="text-lg font-display text-carbon-50 mb-1">
              Berhasil Bergabung!
            </h2>
            <p className="text-xs text-carbon-400 mb-4">
              Anda sekarang menjadi anggota organisasi.
            </p>

            <Link href={`/org/${joinedSlug}/dashboard`}>
              <Button className="w-full">Buka Dashboard</Button>
            </Link>
          </motion.div>
        ) : invite === undefined ? (
          /* Loading */
          <div className="card p-6 text-center">
            <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-carbon-400">Memuat undangan...</p>
          </div>
        ) : invite === null ? (
          /* Invalid / expired invite */
          <div className="card p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rust/10 border border-rust/20 flex items-center justify-center mx-auto mb-4">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="text-rust"
              >
                <path
                  d="M6 6l8 8M14 6l-8 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h2 className="text-lg font-display text-carbon-50 mb-1">
              Undangan Tidak Valid
            </h2>
            <p className="text-xs text-carbon-400 mb-4">
              Kode undangan tidak ditemukan, sudah kedaluwarsa, atau sudah
              dicabut.
            </p>

            <Link href="/">
              <Button variant="secondary" className="w-full">
                Kembali
              </Button>
            </Link>
          </div>
        ) : invite.alreadyMember ? (
          /* Already a member */
          <div className="card p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-copper/10 border border-copper/20 flex items-center justify-center mx-auto mb-4">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="text-copper"
              >
                <path
                  d="M5 10l3.5 3.5L15 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 className="text-lg font-display text-carbon-50 mb-1">
              Sudah Bergabung
            </h2>
            <p className="text-xs text-carbon-400 mb-4">
              Anda sudah menjadi anggota{" "}
              <strong className="text-carbon-200">{invite.orgName}</strong>.
            </p>

            <Link href={`/org/${invite.orgSlug}/dashboard`}>
              <Button className="w-full">Buka Dashboard</Button>
            </Link>
          </div>
        ) : (
          /* ── Accept invite ────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <div className="text-center mb-5">
              <div className="stencil mb-2">UNDANGAN</div>
              <h2 className="font-display text-xl text-carbon-50 mb-1">
                {invite.orgName}
              </h2>
              <p className="text-xs text-carbon-400">
                Anda diundang untuk bergabung ke organisasi ini.
              </p>
            </div>

            {/* Invite code display */}
            <div className="bg-carbon-900 border border-carbon-700/40 rounded-sm p-3 mb-5 text-center">
              <p className="text-[9px] uppercase tracking-[0.2em] text-carbon-500 mb-1">
                Kode
              </p>
              <code className="text-lg font-mono font-bold text-copper tracking-[0.15em]">
                {code}
              </code>
            </div>

            {error && (
              <div className="text-xs text-rust bg-rust/8 border border-rust/20 rounded-sm px-3 py-2 mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Link href="/" className="flex-1">
                <Button variant="secondary" className="w-full">
                  Batal
                </Button>
              </Link>
              <Button
                loading={loading}
                onClick={handleAccept}
                className="flex-1"
              >
                Bergabung
              </Button>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-carbon-500 mt-6 font-mono uppercase tracking-wider">
          Kartu Stock Digital &middot; v2.0
        </p>
      </div>
    </div>
  );
}
