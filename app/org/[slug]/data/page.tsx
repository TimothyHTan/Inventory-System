"use client";

import { useState, useEffect, useRef } from "react";
import { useOrganization } from "@/components/OrganizationProvider";
import { PageTransition } from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useQuery, useMutation } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { formatMonth, formatNumber, timeAgo } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i <= 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value, label: formatMonth(value) });
  }
  return options;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DataPage() {
  const { org, isManager, isLoading } = useOrganization();
  const [selectedMonth, setSelectedMonth] = useState(getMonthOptions()[0]?.value ?? "");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const pendingMonth = useRef<string | null>(null);

  const reports = useQuery(
    api.reports.list,
    org ? { organizationId: org._id } : "skip"
  );
  const products = useQuery(
    api.products.list,
    org ? { organizationId: org._id } : "skip"
  );
  const generateReport = useMutation(api.reports.generate);
  const removeReport = useMutation(api.reports.remove);
  const monthOptions = getMonthOptions();
  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"reports">; month: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Update message reactively when report finishes generating
  useEffect(() => {
    if (!pendingMonth.current || !reports) return;
    const report = reports.find((r) => r.month === pendingMonth.current);
    if (report?.status === "completed") {
      setSuccess(`Laporan ${formatMonth(pendingMonth.current)} selesai dibuat`);
      pendingMonth.current = null;
    } else if (report?.status === "failed") {
      setError(report.error || "Gagal membuat laporan");
      setSuccess(null);
      pendingMonth.current = null;
    }
  }, [reports]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-carbon-400">Organisasi tidak ditemukan</p>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="text-center py-20">
        <div className="inline-block mb-4">
          <div className="w-12 h-12 rounded-sm bg-rust/10 border-2 border-rust/20 flex items-center justify-center mx-auto">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="text-rust"
            >
              <path
                d="M12 15v.01M12 12V8m0 14a10 10 0 110-20 10 10 0 010 20z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        <p className="text-sm text-carbon-300 mb-1">Akses Ditolak</p>
        <p className="text-xs text-carbon-500">
          Halaman data hanya tersedia untuk Manajer ke atas.
        </p>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!selectedMonth) return;
    setError(null);
    setSuccess(null);
    setGenerating(true);
    try {
      pendingMonth.current = selectedMonth;
      const productLabel = selectedProduct
        ? products?.find((p) => p._id === selectedProduct)?.name
        : undefined;
      await generateReport({
        organizationId: org._id,
        month: selectedMonth,
        ...(selectedProduct ? { productId: selectedProduct as Id<"products"> } : {}),
      });
      setSuccess(
        `Laporan ${formatMonth(selectedMonth)}${productLabel ? ` (${productLabel})` : ""} sedang dibuat...`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat laporan");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PageTransition>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="stencil text-[10px] text-carbon-500 mb-1">EKSPOR DATA</p>
          <h1 className="font-serif text-2xl text-carbon-50">
            Laporan
          </h1>
          <p className="text-xs text-carbon-400 mt-1">
            Laporan bulanan dalam format Kartu Stock (.xlsx) — dibuat otomatis
            setiap tanggal 1.
          </p>
        </div>

        {/* Generate section */}
        <div className="card p-4 mb-6">
          <p className="stencil text-[10px] text-carbon-500 mb-3">
            BUAT LAPORAN
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="w-full sm:w-auto">
              <label className="block text-xs text-carbon-400 mb-1.5">
                Pilih bulan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-64 bg-carbon-800 border border-carbon-700/60 rounded-sm px-3 py-2 text-sm text-carbon-100 focus:outline-none focus:border-copper/40"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-xs text-carbon-400 mb-1.5">
                Pilih produk
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full sm:w-64 bg-carbon-800 border border-carbon-700/60 rounded-sm px-3 py-2 text-sm text-carbon-100 focus:outline-none focus:border-copper/40"
              >
                <option value="">Semua produk</option>
                {products?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleGenerate}
              loading={generating}
              disabled={!selectedMonth}
              size="md"
            >
              Buat Laporan
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-rust mt-3"
              >
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-sage mt-3"
              >
                {success}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Reports list */}
        <div className="card">
          <div className="px-4 py-3 border-b border-carbon-700/40">
            <p className="stencil text-[10px] text-carbon-500">
              LAPORAN TERSEDIA
            </p>
          </div>

          {!reports ? (
            <div className="p-8 text-center">
              <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin mx-auto" />
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-carbon-400">
                Belum ada laporan yang dibuat.
              </p>
              <p className="text-xs text-carbon-500 mt-1">
                Pilih bulan di atas dan klik &ldquo;Buat Laporan&rdquo; untuk
                memulai.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-carbon-700/30">
              {reports.map((report, i) => (
                <motion.div
                  key={report._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3"
                >
                  {/* Left: month + status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-serif text-sm text-carbon-100">
                        {formatMonth(report.month)}
                        {report.productName && (
                          <span className="text-xs text-carbon-400 font-sans ml-1.5">
                            — {report.productName}
                          </span>
                        )}
                      </span>
                      {report.status === "generating" && (
                        <Badge variant="copper">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-copper animate-pulse mr-0.5" />
                          Membuat...
                        </Badge>
                      )}
                      {report.status === "completed" && (
                        <Badge variant="sage">Selesai</Badge>
                      )}
                      {report.status === "failed" && (
                        <Badge variant="rust">Gagal</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-carbon-500">
                      {report.status === "completed" && (
                        <>
                          {report.productCount !== undefined && (
                            <span>
                              {formatNumber(report.productCount)} produk
                            </span>
                          )}
                          {report.transactionCount !== undefined && (
                            <span>
                              {formatNumber(report.transactionCount)} transaksi
                            </span>
                          )}
                          {report.fileSize !== undefined && (
                            <span>{formatFileSize(report.fileSize)}</span>
                          )}
                        </>
                      )}
                      {report.status === "failed" && report.error && (
                        <span className="text-rust/70 truncate max-w-xs">
                          {report.error}
                        </span>
                      )}
                      {report.createdAt && (
                        <span>{timeAgo(report.createdAt)}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2">
                    {report.status === "completed" && report.fileUrl && (
                      <a
                        href={report.fileUrl}
                        download={`Kartu Stock${report.productName ? ` - ${report.productName}` : ""} - ${formatMonth(report.month)}.xlsx`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-copper bg-copper/10 border border-copper/20 rounded-sm hover:bg-copper/20 transition-colors"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path
                            d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Download
                      </a>
                    )}
                    {(report.status === "completed" ||
                      report.status === "failed") && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            setError(null);
                            setSuccess(null);
                            try {
                              pendingMonth.current = report.month;
                              await generateReport({
                                organizationId: org._id,
                                month: report.month,
                              });
                              setSuccess(
                                `Laporan ${formatMonth(report.month)} sedang dibuat ulang...`
                              );
                            } catch (e) {
                              setError(
                                e instanceof Error
                                  ? e.message
                                  : "Gagal membuat laporan"
                              );
                            }
                          }}
                        >
                          Buat Ulang
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            setDeleteTarget({ id: report._id, month: report.month })
                          }
                        >
                          Hapus
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Hapus Laporan"
          message={
            deleteTarget
              ? `Laporan ${formatMonth(deleteTarget.month)} akan dihapus permanen dari server. Tindakan ini tidak dapat dibatalkan.`
              : ""
          }
          confirmText="Hapus"
          variant="danger"
          loading={deleting}
          onConfirm={async () => {
            if (!deleteTarget) return;
            setDeleting(true);
            try {
              await removeReport({
                organizationId: org._id,
                reportId: deleteTarget.id,
              });
              setSuccess(`Laporan ${formatMonth(deleteTarget.month)} dihapus`);
              setError(null);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Gagal menghapus laporan"
              );
            } finally {
              setDeleting(false);
              setDeleteTarget(null);
            }
          }}
        />
      </main>
    </PageTransition>
  );
}
