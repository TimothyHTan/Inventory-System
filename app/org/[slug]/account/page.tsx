"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization, ROLE_LABELS } from "@/components/OrganizationProvider";
import { Badge } from "@/components/ui/Badge";
import { PageTransition } from "@/components/motion/PageTransition";

const roleBadgeVariant: Record<string, "copper" | "sage" | "rust" | "muted"> = {
  employee: "muted",
  logistic: "sage",
  manager: "copper",
  owner: "copper",
  admin: "rust",
};

export default function AccountPage() {
  const user = useQuery(api.users.current);
  const { org, membership, isLoading: orgLoading } = useOrganization();
  const [darkMode, setDarkMode] = useState(true);

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="stencil mb-1">Akun</div>
          <h1 className="font-display text-2xl text-carbon-50">Pengaturan</h1>
        </div>

        {/* Profile info */}
        <section className="card p-5 mb-6">
          <div className="stencil mb-3" style={{ fontSize: "9px" }}>
            PROFIL
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-carbon-400">Nama</span>
              <span className="text-sm text-carbon-100">
                {user?.name || "—"}
              </span>
            </div>
            <div className="h-px bg-carbon-700/40" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-carbon-400">Email</span>
              <span className="text-sm text-carbon-200 font-mono">
                {user?.email || "—"}
              </span>
            </div>
            <div className="h-px bg-carbon-700/40" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-carbon-400">Organisasi</span>
              <span className="text-sm text-carbon-100">
                {org?.name || "—"}
              </span>
            </div>
            <div className="h-px bg-carbon-700/40" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-carbon-400">Role</span>
              {membership && (
                <Badge variant={roleBadgeVariant[membership.role] || "muted"}>
                  {ROLE_LABELS[membership.role] || membership.role}
                </Badge>
              )}
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="card p-5 mb-6">
          <div className="stencil mb-3" style={{ fontSize: "9px" }}>
            TAMPILAN
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-carbon-100">Mode Gelap</p>
              <p className="text-xs text-carbon-500 mt-0.5">
                Segera hadir — untuk sementara hanya mode gelap yang tersedia.
              </p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                darkMode ? "bg-copper/30" : "bg-carbon-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200 ${
                  darkMode
                    ? "translate-x-5 bg-copper"
                    : "translate-x-0 bg-carbon-400"
                }`}
              />
            </button>
          </div>
        </section>

        {/* Placeholder sections */}
        <section className="card p-5 opacity-50">
          <div className="stencil mb-3" style={{ fontSize: "9px" }}>
            SEGERA HADIR
          </div>
          <div className="space-y-2 text-xs text-carbon-500">
            <p>Ubah nama tampilan</p>
            <p>Ubah kata sandi</p>
            <p>Notifikasi</p>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
