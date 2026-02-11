"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useEffect } from "react";
import Link from "next/link";

type Flow = "signIn" | "signUp";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  const [flow, setFlow] = useState<Flow>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn("password", {
        email,
        password,
        ...(flow === "signUp" ? { name } : {}),
        flow,
      });
      router.push("/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message.toLowerCase() : "";

      if (flow === "signUp") {
        if (
          message.includes("already") ||
          message.includes("exists") ||
          message.includes("duplicate") ||
          message.includes("registered")
        ) {
          setError(
            "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain."
          );
        } else if (
          message.includes("password") &&
          (message.includes("weak") ||
            message.includes("short") ||
            message.includes("min"))
        ) {
          setError(
            "Password terlalu lemah. Gunakan minimal 8 karakter."
          );
        } else {
          setError("Gagal membuat akun. Email mungkin sudah terdaftar.");
        }
      } else {
        if (
          message.includes("invalid") ||
          message.includes("credentials") ||
          message.includes("password") ||
          message.includes("not found")
        ) {
          setError("Email atau password salah. Silakan coba lagi.");
        } else {
          setError("Gagal masuk. Periksa email dan password Anda.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
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
        {/* Logo area */}
        <div className="text-center mb-8">
          {/* Diamond logo */}
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
        <div className="card p-6">
          {/* Flow toggle */}
          <div className="flex mb-6 bg-carbon-900 rounded-sm p-0.5 border border-carbon-700/30">
            <button
              type="button"
              onClick={() => {
                setFlow("signIn");
                setError("");
              }}
              className={`flex-1 py-2 text-xs uppercase tracking-wider font-medium rounded-sm transition-all ${
                flow === "signIn"
                  ? "bg-carbon-700 text-carbon-50"
                  : "text-carbon-400 hover:text-carbon-200"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setFlow("signUp");
                setError("");
              }}
              className={`flex-1 py-2 text-xs uppercase tracking-wider font-medium rounded-sm transition-all ${
                flow === "signUp"
                  ? "bg-carbon-700 text-carbon-50"
                  : "text-carbon-400 hover:text-carbon-200"
              }`}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {flow === "signUp" && (
              <Input
                label="Nama"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap"
                required
              />
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@perusahaan.com"
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={
                flow === "signIn" ? "current-password" : "new-password"
              }
            />

            {error && (
              <div className="text-xs text-rust bg-rust/8 border border-rust/20 rounded-sm px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              {flow === "signIn" ? "Masuk" : "Buat Akun"}
            </Button>

            {flow === "signIn" && (
              <div className="text-center pt-1">
                <Link
                  href="/forgot-password"
                  className="text-xs text-carbon-400 hover:text-copper transition-colors"
                >
                  Lupa Password?
                </Link>
              </div>
            )}
          </form>
        </div>

        {/* Footer text */}
        <p className="text-center text-[10px] text-carbon-500 mt-6 font-mono uppercase tracking-wider">
          Kartu Stock Digital &middot; v1.0
        </p>
      </div>
    </div>
  );
}
