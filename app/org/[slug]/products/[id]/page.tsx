"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useOrganization } from "@/components/OrganizationProvider";
import { TransactionTable } from "@/components/TransactionTable";
import { TransactionForm } from "@/components/TransactionForm";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageTransition } from "@/components/motion/PageTransition";
import { motion } from "motion/react";
import { formatNumber, formatMonth, getMonthString } from "@/lib/utils";

export default function OrgProductDetailPage() {
  const params = useParams();
  const productId = params.id as Id<"products">;
  const { org, canEdit } = useOrganization();

  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");

  const product = useQuery(api.products.get, { id: productId });
  const transactions = useQuery(api.transactions.list, {
    productId,
    ...(selectedMonth ? { month: selectedMonth } : {}),
  });

  if (product === undefined) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-carbon-700 rounded w-1/4" />
          <div className="h-8 bg-carbon-700 rounded w-1/2" />
          <div className="h-64 bg-carbon-800 rounded" />
        </div>
      </div>
    );
  }

  if (product === null || !org) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-center">
        <p className="text-carbon-400">Produk tidak ditemukan</p>
        <Link
          href={org ? `/org/${org.slug}/dashboard` : "/"}
          className="text-copper text-sm hover:underline mt-2 inline-block"
        >
          Kembali ke dashboard
        </Link>
      </div>
    );
  }

  // Generate month options (last 12 months)
  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(getMonthString(d));
  }

  return (
    <PageTransition>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-carbon-400 mb-6">
          <Link
            href={`/org/${org.slug}/dashboard`}
            className="hover:text-carbon-100 transition-colors"
          >
            Dashboard
          </Link>
          <span className="text-carbon-600">/</span>
          <span className="text-carbon-200">{product.name}</span>
        </div>

        {/* Stock Card Header */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="stencil mb-2 flex items-center gap-2">
                K A R T U &nbsp; S T O C K
                {product.description && (
                  <Badge variant="muted">{product.description}</Badge>
                )}
              </div>
              <h1 className="font-display text-3xl text-carbon-50">
                {product.name}
              </h1>
            </div>

            <div className="text-right">
              <motion.div
                key={product.currentStock}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="mono-num text-4xl font-bold text-copper"
              >
                {formatNumber(product.currentStock)}
              </motion.div>
              <div className="stencil mt-1 text-copper/60">SISA</div>
            </div>
          </div>

          <div className="mt-4 h-px bg-gradient-to-r from-copper/30 via-carbon-700/40 to-transparent" />
        </div>

        {/* Controls bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-carbon-800 border border-carbon-600/30 rounded-sm px-3 py-1.5 text-xs text-carbon-200 focus:outline-none focus:border-copper/40"
            >
              <option value="">Semua bulan</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>

            {selectedMonth && (
              <button
                onClick={() => setSelectedMonth("")}
                className="text-xs text-carbon-400 hover:text-carbon-200 transition-colors"
              >
                Reset
              </button>
            )}

            {transactions && (
              <span className="text-xs text-carbon-500 font-mono">
                {transactions.length} transaksi
              </span>
            )}
          </div>

          {canEdit && (
            <Button onClick={() => setShowForm(true)} size="md">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2v10M2 7h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Tambah Transaksi
            </Button>
          )}
        </div>

        {/* Transaction Table */}
        <div className="card overflow-hidden">
          {transactions === undefined ? (
            <div className="p-8 animate-pulse space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-carbon-700/50 rounded" />
              ))}
            </div>
          ) : (
            <TransactionTable transactions={transactions} />
          )}
        </div>

        {/* Transaction Form Modal */}
        <Modal
          open={showForm}
          onClose={() => setShowForm(false)}
          title="Tambah Transaksi"
        >
          <TransactionForm
            productId={productId}
            currentStock={product.currentStock}
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      </main>
    </PageTransition>
  );
}
