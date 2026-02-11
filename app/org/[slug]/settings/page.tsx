"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  useOrganization,
  ROLE_LABELS,
  OrgRole,
} from "@/components/OrganizationProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageTransition } from "@/components/motion/PageTransition";
import { motion, AnimatePresence } from "motion/react";

// Badge variant per role
const roleBadgeVariant: Record<string, "copper" | "sage" | "rust" | "muted"> = {
  employee: "muted",
  logistic: "sage",
  manager: "copper",
  owner: "copper",
  admin: "rust",
};

// Ordered list of assignable roles (lowest → highest)
const ALL_ROLES: OrgRole[] = ["employee", "logistic", "manager", "owner", "admin"];

export default function OrgSettingsPage() {
  const router = useRouter();
  const { org, isLogistic, isOwner, isAdmin, isLoading: orgLoading } =
    useOrganization();

  const members = useQuery(
    api.organizations.getMembers,
    org ? { organizationId: org._id } : "skip"
  );
  const invites = useQuery(
    api.organizations.getInvites,
    org && isOwner ? { organizationId: org._id } : "skip"
  );

  const updateOrg = useMutation(api.organizations.update);
  const updateMemberRole = useMutation(api.organizations.updateMemberRole);
  const removeMember = useMutation(api.organizations.removeMember);
  const createInvite = useMutation(api.organizations.createInvite);
  const revokeInvite = useMutation(api.organizations.revokeInvite);
  const removeOrg = useMutation(api.organizations.remove);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [newInviteCode, setNewInviteCode] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect employee to dashboard — they should never see settings
  if (!org || (!isLogistic && !isOwner)) {
    router.push(org ? `/org/${org.slug}/dashboard` : "/");
    return null;
  }

  const handleSaveName = async () => {
    if (!newName.trim() || !org) return;
    setError("");
    setSuccess("");
    setSavingName(true);
    try {
      await updateOrg({ organizationId: org._id, name: newName.trim() });
      setNameEditing(false);
      setSuccess("Nama organisasi berhasil diubah");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengubah nama organisasi"
      );
    } finally {
      setSavingName(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!org) return;
    setError("");
    setCreatingInvite(true);
    try {
      const code = await createInvite({ organizationId: org._id });
      setNewInviteCode(code);
      setTimeout(() => setNewInviteCode(""), 30000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat kode undangan"
      );
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (deleteConfirm !== org.name || !org) return;
    setError("");
    setDeleting(true);
    try {
      await removeOrg({ organizationId: org._id });
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menghapus organisasi"
      );
      setDeleting(false);
    }
  };

  const handleRoleChange = async (
    memberId: Id<"organizationMembers">,
    role: OrgRole
  ) => {
    setError("");
    try {
      await updateMemberRole({ memberId, role });
      setSuccess(`Role berhasil diubah menjadi ${ROLE_LABELS[role]}`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message.toLowerCase() : "";
      if (message.includes("own") || message.includes("sendiri")) {
        setError("Tidak bisa mengubah role Anda sendiri");
      } else {
        setError(
          err instanceof Error ? err.message : "Gagal mengubah role"
        );
      }
    }
  };

  const handleRemoveMember = async (memberId: Id<"organizationMembers">) => {
    setError("");
    try {
      await removeMember({ memberId });
      setSuccess("Anggota berhasil dihapus");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message.toLowerCase() : "";
      if (message.includes("own") || message.includes("sendiri")) {
        setError("Tidak bisa menghapus diri sendiri dari organisasi");
      } else {
        setError(
          err instanceof Error ? err.message : "Gagal menghapus anggota"
        );
      }
    }
  };

  // Roles visible in the dropdown (admin option only visible to admin users)
  const assignableRoles = isAdmin
    ? ALL_ROLES
    : ALL_ROLES.filter((r) => r !== "admin");

  return (
    <PageTransition>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="stencil mb-1">Pengaturan</div>
          <h1 className="font-display text-2xl text-carbon-50">
            {org.name}
          </h1>
        </div>

        {/* Error/Success alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 card border-rust/20 p-4 flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-rust/15 border border-rust/30 flex items-center justify-center flex-shrink-0">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="text-rust"
                >
                  <path
                    d="M6 3v3M6 8.5h.01"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-rust">{error}</p>
              </div>
              <button
                onClick={() => setError("")}
                className="text-rust/60 hover:text-rust transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M4 4l6 6M10 4l-6 6"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 card border-sage/20 p-4 flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-sage/15 border border-sage/30 flex items-center justify-center flex-shrink-0">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="text-sage"
                >
                  <path
                    d="M3 6l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-sage">{success}</p>
              </div>
              <button
                onClick={() => setSuccess("")}
                className="text-sage/60 hover:text-sage transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M4 4l6 6M10 4l-6 6"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Organization Name (owner+ only) ──────────────────── */}
        {isOwner && (
          <section className="card p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-carbon-50 uppercase tracking-wider">
                Nama Organisasi
              </h2>
            </div>

            {nameEditing ? (
              <div className="flex gap-3">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={org.name}
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" loading={savingName} onClick={handleSaveName}>
                  Simpan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setNameEditing(false)}
                >
                  Batal
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-carbon-100">{org.name}</p>
                  <p className="text-xs text-carbon-500 font-mono mt-0.5">
                    /{org.slug}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNewName(org.name);
                    setNameEditing(true);
                  }}
                >
                  Ubah
                </Button>
              </div>
            )}
          </section>
        )}

        {/* ── Members ──────────────────────────────────────────── */}
        <section className="card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-carbon-700/50 flex items-center justify-between">
            <h2 className="text-sm font-medium text-carbon-50 uppercase tracking-wider">
              Anggota
            </h2>
            <span className="text-xs text-carbon-400 font-mono">
              {members?.length ?? 0} orang
            </span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-carbon-600/40">
                <th className="text-left py-3 px-5 stencil font-semibold">
                  Nama
                </th>
                <th className="text-left py-3 px-5 stencil font-semibold hidden sm:table-cell">
                  Email
                </th>
                <th className="text-left py-3 px-5 stencil font-semibold">
                  Role
                </th>
                {isOwner && (
                  <th className="text-right py-3 px-5 stencil font-semibold">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {members === undefined ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="ledger-line">
                    <td className="py-3 px-5">
                      <div className="h-4 bg-carbon-700 rounded w-24 animate-pulse" />
                    </td>
                    <td className="py-3 px-5 hidden sm:table-cell">
                      <div className="h-4 bg-carbon-700 rounded w-40 animate-pulse" />
                    </td>
                    <td className="py-3 px-5">
                      <div className="h-4 bg-carbon-700 rounded w-16 animate-pulse" />
                    </td>
                    {isOwner && <td className="py-3 px-5" />}
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td
                    colSpan={isOwner ? 4 : 3}
                    className="text-center py-8 text-carbon-400 text-sm"
                  >
                    Tidak ada anggota
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <motion.tr
                    key={m._id}
                    layout
                    className="ledger-line hover:bg-carbon-800/40 transition-colors"
                  >
                    <td className="py-3 px-5 text-carbon-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-carbon-700 flex items-center justify-center text-[10px] font-medium text-carbon-300 flex-shrink-0">
                          {(m.userName || m.userEmail || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <span className="truncate">
                          {m.userName || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-carbon-300 font-mono text-xs hidden sm:table-cell">
                      {m.userEmail || "—"}
                    </td>
                    <td className="py-3 px-5">
                      <Badge variant={roleBadgeVariant[m.role] || "muted"}>
                        {ROLE_LABELS[m.role] || m.role}
                      </Badge>
                    </td>
                    {isOwner && (
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={m.role}
                            onChange={(e) =>
                              handleRoleChange(
                                m._id,
                                e.target.value as OrgRole
                              )
                            }
                            className="bg-carbon-800 border border-carbon-600/30 rounded-sm px-2 py-1 text-xs text-carbon-200 focus:outline-none focus:border-copper/40"
                          >
                            {assignableRoles.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRemoveMember(m._id)}
                            className="text-carbon-500 hover:text-rust transition-colors p-1"
                            title="Hapus anggota"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                            >
                              <path
                                d="M4 4l6 6M10 4l-6 6"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* ── Invites (owner+ only) ─────────────────────────── */}
        {isOwner && (
          <section className="card p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-carbon-50 uppercase tracking-wider">
                Kode Undangan
              </h2>
              <Button
                size="sm"
                variant="secondary"
                loading={creatingInvite}
                onClick={handleCreateInvite}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M6 2.5v7M2.5 6h7"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                Buat Kode
              </Button>
            </div>

            {/* Newly created code banner */}
            <AnimatePresence>
              {newInviteCode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="bg-sage/8 border border-sage/20 rounded-sm p-4">
                    <p className="text-xs text-sage mb-2">
                      Kode undangan baru dibuat:
                    </p>
                    <div className="flex items-center gap-3">
                      <code className="text-lg font-mono font-bold text-sage tracking-[0.15em]">
                        {newInviteCode}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(newInviteCode);
                        }}
                      >
                        Salin
                      </Button>
                    </div>
                    <p className="text-[10px] text-carbon-400 mt-2">
                      Bagikan kode ini kepada orang yang ingin Anda undang.
                      Mereka bisa bergabung di halaman{" "}
                      <span className="font-mono text-carbon-300">
                        /invite/{newInviteCode}
                      </span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Existing invites */}
            {invites && invites.length > 0 ? (
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div
                    key={inv._id}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-sm border ${
                      inv.revoked
                        ? "border-carbon-700/30 opacity-50"
                        : "border-carbon-600/30 bg-carbon-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono font-semibold text-carbon-100 tracking-wider">
                        {inv.code}
                      </code>
                      <span className="text-[10px] text-carbon-500">
                        {inv.uses} digunakan
                      </span>
                      {inv.revoked && (
                        <Badge variant="rust">Dicabut</Badge>
                      )}
                    </div>

                    {!inv.revoked && (
                      <button
                        onClick={() => revokeInvite({ inviteId: inv._id })}
                        className="text-xs text-carbon-400 hover:text-rust transition-colors"
                      >
                        Cabut
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-carbon-500">
                Belum ada kode undangan. Buat kode untuk mengundang anggota baru.
              </p>
            )}
          </section>
        )}

        {/* ── INFORMASI ROLE ─────────────────────────────────── */}
        <section className="card p-5 mb-6">
          <div className="stencil mb-3" style={{ fontSize: "9px" }}>
            INFORMASI ROLE
          </div>
          <div className="space-y-2.5 text-xs text-carbon-400">
            <p>
              <Badge variant="rust" className="mr-1.5">Admin</Badge>
              — semua hak akses Pemilik; akses ke Mode Debug (segera hadir).
            </p>
            <p>
              <Badge variant="copper" className="mr-1.5">Pemilik</Badge>
              — kendali penuh atas organisasi: kelola anggota, undangan, dan hapus organisasi.
            </p>
            <p>
              <Badge variant="copper" className="mr-1.5">Manajer</Badge>
              — dapat menghapus transaksi kapan saja tanpa batasan waktu.
            </p>
            <p>
              <Badge variant="sage" className="mr-1.5">Staf Logistik</Badge>
              — memproses permintaan stok keluar; mencatat barang masuk secara langsung; dapat menghapus transaksi dalam 60 menit pertama.
            </p>
            <p>
              <Badge variant="muted" className="mr-1.5">Karyawan</Badge>
              — hanya dapat melihat stok dan mengajukan permintaan barang keluar.
            </p>
          </div>
        </section>

        {/* ── Debug Mode Stub (admin only) ───────────────────── */}
        {isAdmin && (
          <section className="card p-5 mb-6 opacity-50">
            <div className="stencil mb-3" style={{ fontSize: "9px" }}>
              MODE DEBUG
            </div>
            <p className="text-xs text-carbon-500">
              {/* TODO: implement debug mode */}
              Segera hadir — fitur debug dan diagnostik untuk admin.
            </p>
          </section>
        )}

        {/* ── Danger Zone (owner+ only) ──────────────────────── */}
        {isOwner && (
          <section className="card border-rust/20 p-5">
            <div className="stencil mb-3 text-rust" style={{ fontSize: "9px" }}>
              ZONA BERBAHAYA
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-carbon-100">Hapus Organisasi</p>
                <p className="text-xs text-carbon-400 mt-0.5">
                  Semua produk, transaksi, dan anggota akan dihapus secara
                  permanen.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
              >
                Hapus Organisasi
              </Button>
            </div>
          </section>
        )}

        {/* Delete confirmation modal */}
        <Modal
          open={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteConfirm("");
          }}
          title="Hapus Organisasi"
        >
          <div className="space-y-4">
            <p className="text-sm text-carbon-300">
              Tindakan ini tidak dapat dibatalkan. Semua data termasuk produk,
              transaksi, dan anggota akan dihapus secara permanen.
            </p>
            <p className="text-sm text-carbon-100">
              Ketik{" "}
              <strong className="text-rust font-mono">{org.name}</strong>{" "}
              untuk mengkonfirmasi:
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={org.name}
            />
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm("");
                }}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={deleting}
                disabled={deleteConfirm !== org.name}
                onClick={handleDeleteOrg}
              >
                Hapus Selamanya
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </PageTransition>
  );
}
