"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useOrganization } from "@/components/OrganizationProvider";
import { PageTransition } from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchBar } from "@/components/SearchBar";
import { motion, AnimatePresence } from "motion/react";
import { timeAgo, formatNumber } from "@/lib/utils";

type StatusTab = "pending" | "fulfilled" | "cancelled";

export default function RequestsPage() {
  const { org, membership, isLogistic, isManager, isLoading: orgLoading } = useOrganization();
  const [activeTab, setActiveTab] = useState<StatusTab>("pending");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Employee view: own requests
  const myRequests = useQuery(
    api.stockRequests.myRequests,
    org ? { organizationId: org._id } : "skip"
  );

  // Logistic+ view: all requests filtered by status
  const allRequests = useQuery(
    api.stockRequests.list,
    org && isLogistic
      ? { organizationId: org._id, status: activeTab }
      : "skip"
  );

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin" />
      </div>
    );
  }

  if (!org || !membership) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-carbon-400">Organisasi tidak ditemukan</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="stencil mb-1">
              {isLogistic ? "Semua Permintaan" : "Permintaan Saya"}
            </div>
            <h1 className="font-display text-2xl text-carbon-50">
              Permintaan Stok
            </h1>
          </div>
          {(!isLogistic || isManager) && (
            <Button onClick={() => setShowCreateModal(true)} size="md">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2v10M2 7h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Ajukan Permintaan
            </Button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1 mb-6">
          {(["pending", "fulfilled", "cancelled"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                activeTab === tab
                  ? "text-copper bg-copper/8"
                  : "text-carbon-400 hover:text-carbon-200 hover:bg-carbon-800/40"
              }`}
            >
              {tab === "pending"
                ? "Menunggu"
                : tab === "fulfilled"
                  ? "Terpenuhi"
                  : "Dibatalkan"}
            </button>
          ))}
        </div>

        {/* Request List */}
        {isLogistic ? (
          <LogisticRequestList
            requests={allRequests}
            status={activeTab}
            orgId={org._id}
          />
        ) : (
          <EmployeeRequestList
            requests={myRequests?.filter((r) => r.status === activeTab)}
            status={activeTab}
          />
        )}

        {/* Create Request Modal */}
        <Modal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Ajukan Permintaan Stok Keluar"
        >
          <CreateRequestForm
            organizationId={org._id}
            onSuccess={() => setShowCreateModal(false)}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>
      </main>
    </PageTransition>
  );
}

// ── Employee's request list ──────────────────────────────────────

function EmployeeRequestList({
  requests,
  status,
}: {
  requests:
    | Array<{
        _id: Id<"stockRequests">;
        productName: string;
        quantity: number;
        note?: string;
        status: string;
        createdAt: number;
        fulfillerName?: string | null;
        fulfilledAt?: number;
        cancellerName?: string | null;
        cancelledAt?: number;
      }>
    | undefined;
  status: StatusTab;
}) {
  const cancelRequest = useMutation(api.stockRequests.cancel);
  const [cancelId, setCancelId] = useState<Id<"stockRequests"> | null>(null);
  const [cancelling, setCancelling] = useState(false);

  if (requests === undefined) {
    return <LoadingSkeleton />;
  }

  if (requests.length === 0) {
    return <EmptyState status={status} />;
  }

  return (
    <>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {requests.map((r, i) => (
            <motion.div
              key={r._id}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{
                opacity: 0,
                x: 40,
                scale: 0.95,
                transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
              }}
              transition={{ duration: 0.2, delay: i * 0.02, ease: [0.16, 1, 0.3, 1] }}
              className="card p-4 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-carbon-100 font-medium truncate">
                    {r.productName}
                  </span>
                  <StatusChip status={r.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-carbon-400">
                  <span className="mono-num">{formatNumber(r.quantity)} unit</span>
                  {r.note && <span className="truncate">{r.note}</span>}
                  <span>{timeAgo(r.createdAt)}</span>
                </div>
                {r.status === "fulfilled" && r.fulfillerName && (
                  <div className="text-xs text-sage/70 mt-1">
                    Dipenuhi oleh {r.fulfillerName}
                    {r.fulfilledAt && ` · ${timeAgo(r.fulfilledAt)}`}
                  </div>
                )}
                {r.status === "cancelled" && r.cancellerName && (
                  <div className="text-xs text-carbon-500 mt-1">
                    Dibatalkan oleh {r.cancellerName}
                    {r.cancelledAt && ` · ${timeAgo(r.cancelledAt)}`}
                  </div>
                )}
              </div>
              {r.status === "pending" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCancelId(r._id)}
                >
                  Batalkan
                </Button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={cancelId !== null}
        onClose={() => setCancelId(null)}
        onConfirm={async () => {
          if (!cancelId) return;
          setCancelling(true);
          try {
            await cancelRequest({ requestId: cancelId });
            setCancelId(null);
          } catch (err) {
            alert(err instanceof Error ? err.message : "Gagal membatalkan");
          } finally {
            setCancelling(false);
          }
        }}
        title="Batalkan Permintaan?"
        message="Permintaan ini akan dibatalkan. Tindakan ini tidak dapat dibatalkan."
        confirmText="Batalkan"
        cancelText="Kembali"
        variant="warning"
        loading={cancelling}
      />
    </>
  );
}

// ── Logistic's request list ──────────────────────────────────────

function LogisticRequestList({
  requests,
  status,
  orgId,
}: {
  requests:
    | Array<{
        _id: Id<"stockRequests">;
        productName: string;
        requesterName: string;
        fulfillerName?: string | null;
        cancellerName?: string | null;
        quantity: number;
        note?: string;
        status: string;
        createdAt: number;
        fulfilledAt?: number;
        cancelledAt?: number;
      }>
    | undefined;
  status: StatusTab;
  orgId: Id<"organizations">;
}) {
  const fulfillRequest = useMutation(api.stockRequests.fulfill);
  const cancelRequest = useMutation(api.stockRequests.cancel);
  const [fulfillId, setFulfillId] = useState<Id<"stockRequests"> | null>(null);
  const [fulfilling, setFulfilling] = useState(false);
  const [fulfillError, setFulfillError] = useState("");
  const [cancelId, setCancelId] = useState<Id<"stockRequests"> | null>(null);
  const [cancelling, setCancelling] = useState(false);

  if (requests === undefined) {
    return <LoadingSkeleton />;
  }

  if (requests.length === 0) {
    return <EmptyState status={status} />;
  }

  return (
    <>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {requests.map((r, i) => (
            <motion.div
              key={r._id}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{
                opacity: 0,
                x: 40,
                scale: 0.95,
                transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
              }}
              transition={{ duration: 0.2, delay: i * 0.02, ease: [0.16, 1, 0.3, 1] }}
              className="card p-4 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-carbon-100 font-medium truncate">
                    {r.productName}
                  </span>
                  <StatusChip status={r.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-carbon-400">
                  <span className="mono-num">
                    {formatNumber(r.quantity)} unit
                  </span>
                  <span>oleh {r.requesterName}</span>
                  {r.note && <span className="truncate">{r.note}</span>}
                  <span>{timeAgo(r.createdAt)}</span>
                </div>
                {r.status === "fulfilled" && r.fulfillerName && (
                  <div className="text-xs text-sage/70 mt-1">
                    Dipenuhi oleh {r.fulfillerName}
                    {r.fulfilledAt && ` · ${timeAgo(r.fulfilledAt)}`}
                  </div>
                )}
                {r.status === "cancelled" && r.cancellerName && (
                  <div className="text-xs text-carbon-500 mt-1">
                    Dibatalkan oleh {r.cancellerName}
                    {r.cancelledAt && ` · ${timeAgo(r.cancelledAt)}`}
                  </div>
                )}
              </div>
              {r.status === "pending" && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCancelId(r._id)}
                  >
                    Batalkan
                  </Button>
                  <Button size="sm" onClick={() => setFulfillId(r._id)}>
                    Penuhi
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Fulfill confirm */}
      <ConfirmDialog
        open={fulfillId !== null}
        onClose={() => {
          setFulfillId(null);
          setFulfillError("");
        }}
        onConfirm={async () => {
          if (!fulfillId) return;
          setFulfilling(true);
          setFulfillError("");
          try {
            await fulfillRequest({ requestId: fulfillId });
            setFulfillId(null);
          } catch (err) {
            setFulfillError(
              err instanceof Error ? err.message : "Gagal memenuhi permintaan"
            );
          } finally {
            setFulfilling(false);
          }
        }}
        title="Penuhi Permintaan?"
        message={
          fulfillError
            ? fulfillError
            : "Stok produk akan berkurang dan transaksi KELUAR akan dibuat otomatis."
        }
        confirmText="Penuhi"
        cancelText="Batal"
        variant={fulfillError ? "danger" : "warning"}
        loading={fulfilling}
      />

      {/* Cancel confirm */}
      <ConfirmDialog
        open={cancelId !== null}
        onClose={() => setCancelId(null)}
        onConfirm={async () => {
          if (!cancelId) return;
          setCancelling(true);
          try {
            await cancelRequest({ requestId: cancelId });
            setCancelId(null);
          } catch (err) {
            alert(err instanceof Error ? err.message : "Gagal membatalkan");
          } finally {
            setCancelling(false);
          }
        }}
        title="Batalkan Permintaan?"
        message="Permintaan ini akan dibatalkan. Tindakan ini tidak dapat dikembalikan."
        confirmText="Batalkan"
        cancelText="Kembali"
        variant="warning"
        loading={cancelling}
      />
    </>
  );
}

// ── Create Request Form ──────────────────────────────────────────

function CreateRequestForm({
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
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const products = useQuery(api.products.search, {
    searchQuery: search,
    organizationId,
  });

  const createRequest = useMutation(api.stockRequests.create);

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

    setLoading(true);
    try {
      await createRequest({
        organizationId,
        productId: selectedProductId,
        quantity: qty,
        note: note.trim() || undefined,
      });
      setShowSuccess(true);
      setTimeout(() => onSuccess(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengajukan permintaan");
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
        <p className="text-sm text-sage font-medium">Permintaan diajukan</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Product Search & Select */}
      <div className="space-y-1.5">
        <label className="block text-xs uppercase tracking-wider text-carbon-300 font-medium">
          Produk
        </label>
        {selectedProduct ? (
          <div className="flex items-center justify-between bg-carbon-800 border border-carbon-600/30 rounded-sm px-3 py-2">
            <div>
              <span className="text-sm text-carbon-100">
                {selectedProduct.name}
              </span>
              <span className="text-xs text-carbon-400 ml-2 mono-num">
                (stok: {formatNumber(selectedProduct.currentStock)})
              </span>
            </div>
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
                    className="w-full text-left px-3 py-2 text-sm text-carbon-200 hover:bg-carbon-700/50 transition-colors flex items-center justify-between"
                  >
                    <span>{p.name}</span>
                    <span className="text-xs text-carbon-400 mono-num">
                      {formatNumber(p.currentStock)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quantity */}
      <Input
        label="Jumlah"
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="0"
      />

      {/* Note */}
      <Input
        label="Catatan (opsional)"
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Alasan permintaan / tujuan"
      />

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-rust bg-rust/8 border border-rust/20 rounded-sm px-3 py-2"
        >
          {error}
        </motion.div>
      )}

      {/* Actions */}
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
          Ajukan
        </Button>
      </div>
    </form>
  );
}

// ── Shared Components ────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  if (status === "pending") {
    return <Badge variant="copper">Menunggu</Badge>;
  }
  if (status === "fulfilled") {
    return <Badge variant="sage">Terpenuhi</Badge>;
  }
  return (
    <Badge variant="muted" className="line-through">
      Dibatalkan
    </Badge>
  );
}

function EmptyState({ status }: { status: StatusTab }) {
  const messages: Record<StatusTab, string> = {
    pending: "Tidak ada permintaan yang menunggu",
    fulfilled: "Belum ada permintaan yang terpenuhi",
    cancelled: "Tidak ada permintaan yang dibatalkan",
  };

  return (
    <div className="text-center py-16">
      <div className="inline-block mb-3">
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          className="text-carbon-600"
        >
          <rect
            x="6"
            y="6"
            width="28"
            height="28"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <path
            d="M14 16h12M14 20h8M14 24h10"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-sm text-carbon-400">{messages[status]}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-4 bg-carbon-700 rounded w-1/3 mb-2" />
          <div className="h-3 bg-carbon-700 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
