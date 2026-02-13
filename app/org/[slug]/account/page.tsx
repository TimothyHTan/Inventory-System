"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization, ROLE_LABELS } from "@/components/OrganizationProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/motion/PageTransition";
import { motion, AnimatePresence } from "motion/react";

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

  // Name change state
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");

  const requestNameChange = useMutation(api.users.requestNameChange);

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin" />
      </div>
    );
  }

  const hasName = !!user?.name;

  const handleNameRequest = async () => {
    if (!newName.trim()) return;
    setNameError("");
    setNameLoading(true);
    try {
      const result = await requestNameChange({
        organizationId: org?._id,
        newName: newName.trim(),
      });
      if (result?.direct) {
        setNameSuccess("Nama berhasil diubah");
      } else {
        setNameSuccess("Permintaan terkirim — menunggu persetujuan manager");
      }
      setEditingName(false);
      setNewName("");
      setTimeout(() => setNameSuccess(""), 3000);
    } catch (err) {
      setNameError(
        err instanceof Error ? err.message : "Gagal mengirim permintaan"
      );
    } finally {
      setNameLoading(false);
    }
  };

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
            {/* Name row */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-carbon-400">Nama</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-carbon-100">
                    {user?.name || "—"}
                  </span>
                  {!editingName && !user?.pendingName && (
                    <button
                      onClick={() => {
                        setNewName(user?.name || "");
                        setEditingName(true);
                        setNameError("");
                      }}
                      className="text-[10px] text-copper hover:text-copper/80 transition-colors"
                    >
                      {hasName ? "Ubah" : "Atur Nama"}
                    </button>
                  )}
                </div>
              </div>

              {/* Pending name indicator */}
              <AnimatePresence>
                {user?.pendingName && !editingName && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 flex items-center gap-2"
                  >
                    <Badge variant="copper">Menunggu</Badge>
                    <span className="text-xs text-copper">
                      Perubahan ke &ldquo;{user.pendingName}&rdquo; menunggu persetujuan
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success message */}
              <AnimatePresence>
                {nameSuccess && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2"
                  >
                    <span className="text-xs text-sage">{nameSuccess}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Edit name form */}
              <AnimatePresence>
                {editingName && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2"
                  >
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nama baru"
                      autoFocus
                    />
                    {nameError && (
                      <p className="text-xs text-rust">{nameError}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        loading={nameLoading}
                        onClick={handleNameRequest}
                        disabled={!newName.trim()}
                      >
                        {hasName ? "Kirim Permintaan" : "Simpan"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingName(false);
                          setNameError("");
                        }}
                      >
                        Batal
                      </Button>
                    </div>
                    {hasName && (
                      <p className="text-[10px] text-carbon-500">
                        Perubahan nama memerlukan persetujuan manager atau pemilik organisasi.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
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
            <p>Ubah kata sandi</p>
            <p>Notifikasi</p>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
