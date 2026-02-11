"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  useOrganization,
  ROLE_TIER,
} from "@/components/OrganizationProvider";
import { PageTransition } from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchBar } from "@/components/SearchBar";
import { Input } from "@/components/ui/Input";
import { motion, AnimatePresence } from "motion/react";
import { formatDate, formatNumber, timeAgo, getTodayString } from "@/lib/utils";

const SIXTY_MINUTES_MS = 60 * 60 * 1000;

export default function InboundPage() {
  const router = useRouter();
  const { org, membership, isLogistic, isManager, isLoading: orgLoading } =
    useOrganization();
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"transactions"> | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Time tick to keep 60-minute countdowns live
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  const transactions = useQuery(
    api.transactions.listInbound,
    org && isLogistic ? { organizationId: org._id } : "skip"
  );

  const removeTransaction = useMutation(api.transactions.remove);

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin" />
      </div>
    );
  }

  if (!org || !isLogistic) {
    router.push(org ? `/org/${org.slug}/dashboard` : "/");
    return null;
  }

  return (
    <PageTransition>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="stencil mb-1">Logistik</div>
            <h1 className="font-display text-2xl text-carbon-50">
              Barang Masuk
            </h1>
          </div>
          <Button onClick={() => setShowForm(true)} size="md">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 2v10M2 7h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Catat Barang Masuk
          </Button>
        </div>

        {/* Inbound Table */}
        <div className="card overflow-hidden">
          {transactions === undefined ? (
            <div className="p-8 animate-pulse space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-carbon-700/50 rounded" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-carbon-400">
                Belum ada transaksi barang masuk
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-carbon-600/40">
                    <th className="text-left py-2.5 px-3 stencil font-semibold w-28">
                      Tanggal
                    </th>
                    <th className="text-left py-2.5 px-3 stencil font-semibold">
                      Produk
                    </th>
                    <th className="text-right py-2.5 px-3 stencil font-semibold w-24">
                      <span className="text-sage">Jumlah</span>
                    </th>
                    <th className="text-left py-2.5 px-3 stencil font-semibold hidden sm:table-cell">
                      Keterangan
                    </th>
                    <th className="text-left py-2.5 px-3 stencil font-semibold hidden md:table-cell">
                      Dicatat Oleh
                    </th>
                    <th className="text-right py-2.5 px-3 stencil font-semibold w-28">
                      Waktu
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {transactions.map((tx, i) => {
                      const withinWindow =
                        now - tx.createdAt < SIXTY_MINUTES_MS;
                      const canDelete = isManager || withinWindow;
                      const expiresAt = tx.createdAt + SIXTY_MINUTES_MS;
                      const isLogisticOnly =
                        membership?.role === "logistic";

                      return (
                        <motion.tr
                          key={tx._id}
                          layout
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.2,
                            delay: i * 0.02,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="ledger-line hover:bg-carbon-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-mono text-xs text-carbon-300">
                            {formatDate(tx.date)}
                          </td>
                          <td className="py-2.5 px-3 text-carbon-100">
                            {tx.productName}
                          </td>
                          <td className="py-2.5 px-3 text-right mono-num text-sage font-medium">
                            {formatNumber(tx.quantity)}
                          </td>
                          <td className="py-2.5 px-3 text-carbon-300 hidden sm:table-cell">
                            {tx.description}
                          </td>
                          <td className="py-2.5 px-3 text-carbon-400 text-xs hidden md:table-cell">
                            {tx.creatorName}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-xs text-carbon-400">
                              {timeAgo(tx.createdAt)}
                            </span>
                            {isLogisticOnly && withinWindow && (
                              <div className="text-[10px] text-carbon-500 mt-0.5">
                                Dapat dihapus sampai{" "}
                                {new Date(expiresAt).toLocaleTimeString(
                                  "id-ID",
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2">
                            {canDelete && (
                              <button
                                onClick={() => setDeleteId(tx._id)}
                                className="text-carbon-500 hover:text-rust transition-colors p-1"
                                title="Hapus transaksi"
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
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Inbound Modal */}
        <Modal
          open={showForm}
          onClose={() => setShowForm(false)}
          title="Catat Barang Masuk"
        >
          <InboundForm
            organizationId={org._id}
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </Modal>

        {/* Delete Confirm */}
        <ConfirmDialog
          open={deleteId !== null}
          onClose={() => setDeleteId(null)}
          onConfirm={async () => {
            if (!deleteId) return;
            setDeleting(true);
            try {
              await removeTransaction({ id: deleteId });
              setDeleteId(null);
            } catch (err) {
              alert(
                err instanceof Error ? err.message : "Gagal menghapus transaksi"
              );
            } finally {
              setDeleting(false);
            }
          }}
          title="Hapus Transaksi?"
          message="Stok produk akan disesuaikan kembali."
          confirmText="Hapus"
          cancelText="Batal"
          variant="danger"
          loading={deleting}
        />
      </main>
    </PageTransition>
  );
}

// ── Inbound Form (product picker + MASUK transaction) ────────────

function InboundForm({
  organizationId,
  onSuccess,
  onCancel,
}: {
  organizationId: Id<"organizations">;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<Id<"products"> | null>(null);
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getTodayString());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const products = useQuery(api.products.search, {
    searchQuery: search,
    organizationId,
  });

  const addTransaction = useMutation(api.transactions.add);
  const selectedProduct = products?.find((p) => p._id === selectedProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedProductId) {
      setError("Pilih produk terlebih dahulu");
      return;
    }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      setError("Jumlah harus lebih dari 0");
      return;
    }
    if (!description.trim()) {
      setError("Keterangan harus diisi");
      return;
    }
    if (!date) {
      setError("Tanggal harus diisi");
      return;
    }

    setLoading(true);
    try {
      await addTransaction({
        productId: selectedProductId,
        type: "in",
        quantity: qty,
        description: description.trim(),
        date,
      });
      setShowSuccess(true);
      setTimeout(() => onSuccess(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-12 h-12 rounded-full bg-sage/15 border border-sage/30 flex items-center justify-center mb-3"
        >
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="text-sage"
          >
            <motion.path
              d="M5 10l3.5 3.5L15 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            />
          </motion.svg>
        </motion.div>
        <p className="text-sm text-sage font-medium">Tersimpan</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Product picker */}
      <div className="space-y-1.5">
        <label className="block text-xs uppercase tracking-wider text-carbon-300 font-medium">
          Produk
        </label>
        {selectedProduct ? (
          <div className="flex items-center justify-between bg-carbon-800 border border-carbon-600/30 rounded-sm px-3 py-2">
            <span className="text-sm text-carbon-100">
              {selectedProduct.name}
            </span>
            <button
              type="button"
              onClick={() => setSelectedProductId(null)}
              className="text-carbon-400 hover:text-carbon-200 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M4 4l6 6M10 4l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Cari produk..."
            />
            {products && products.length > 0 && search && (
              <div className="max-h-40 overflow-y-auto border border-carbon-600/30 rounded-sm bg-carbon-800">
                {products.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => {
                      setSelectedProductId(p._id);
                      setSearch("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-carbon-200 hover:bg-carbon-700/50 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Input
        label="Jumlah"
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="0"
        autoFocus
      />

      <Input
        label="Keterangan / Supplier"
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Nama supplier / catatan"
      />

      <Input
        label="Tanggal"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
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

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="flex-1"
        >
          Batal
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          Simpan
        </Button>
      </div>
    </form>
  );
}
