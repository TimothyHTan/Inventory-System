"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useOrganization } from "@/components/OrganizationProvider";
import { motion, AnimatePresence } from "motion/react";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { PageTransition } from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LogisticNotificationBoard } from "@/components/LogisticNotificationBoard";
import Link from "next/link";

export default function OrgDashboardPage() {
  const { org, isOwner, isLogistic, isLoading: orgLoading } = useOrganization();
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const products = useQuery(
    api.products.search,
    org ? { searchQuery: search, organizationId: org._id } : "skip"
  );

  const bulkRemove = useMutation(api.products.bulkRemove);

  if (orgLoading) {
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

  // Count stats
  const totalProducts = products?.length ?? 0;
  const totalStock =
    products?.reduce((sum, p) => sum + p.currentStock, 0) ?? 0;
  const lowStockCount =
    products?.filter((p) => p.currentStock < 100 && p.currentStock > 0)
      .length ?? 0;

  return (
    <PageTransition>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="stencil mb-1">Dashboard</div>
            <h1 className="font-display text-2xl text-carbon-50">
              Daftar Produk
            </h1>
          </div>

          {(isLogistic || isOwner) && (
            <div className="flex gap-2">
              <AnimatePresence mode="wait">
                {deleteMode ? (
                  <motion.div
                    key="delete-mode"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="flex gap-2"
                  >
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => {
                        setDeleteMode(false);
                        setSelectedProducts(new Set());
                      }}
                    >
                      Batal
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      disabled={selectedProducts.size === 0}
                      onClick={() => {
                        if (selectedProducts.size === 0) return;
                        setShowConfirmDialog(true);
                      }}
                    >
                      Hapus ({selectedProducts.size})
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="normal-mode"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="flex gap-2"
                  >
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setDeleteMode(true)}
                      >
                        Hapus Produk
                      </Button>
                    )}
                    {isLogistic && (
                      <Link href={`/org/${org.slug}/products/new`}>
                        <Button size="md">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path
                              d="M7 2v10M2 7h10"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                          Tambah Produk
                        </Button>
                      </Link>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="PRODUK" value={totalProducts} />
          <StatCard label="TOTAL STOK" value={totalStock} />
          <StatCard
            label="STOK RENDAH"
            value={lowStockCount}
            variant={lowStockCount > 0 ? "warning" : "default"}
          />
        </div>

        {/* Search */}
        <SearchBar
          value={search}
          onChange={setSearch}
          className="mb-6 max-w-md"
        />

        {/* Product grid */}
        {products === undefined ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-carbon-700 rounded w-2/3 mb-3" />
                <div className="h-3 bg-carbon-700 rounded w-1/3 mb-4" />
                <div className="h-6 bg-carbon-700 rounded w-1/4 ml-auto" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block mb-4">
              <div className="w-16 h-16 rotate-45 border-2 border-dashed border-carbon-600 flex items-center justify-center mx-auto">
                <div className="w-6 h-6 border border-carbon-600 -rotate-45" />
              </div>
            </div>
            <p className="text-sm text-carbon-400 mb-1">
              {search ? "Tidak ada produk ditemukan" : "Belum ada produk"}
            </p>
            <p className="text-xs text-carbon-500">
              {search
                ? `Pencarian "${search}" tidak memberikan hasil`
                : "Tambahkan produk pertama untuk memulai"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((product, index) => (
              <ProductCard
                key={product._id}
                product={product}
                index={index}
                orgSlug={org.slug}
                deleteMode={deleteMode}
                isSelected={selectedProducts.has(product._id)}
                onToggleSelect={(id) => {
                  const newSet = new Set(selectedProducts);
                  if (newSet.has(id)) {
                    newSet.delete(id);
                  } else {
                    newSet.add(id);
                  }
                  setSelectedProducts(newSet);
                }}
              />
            ))}
          </div>
        )}

        {/* Logistic notification board */}
        {org && <LogisticNotificationBoard />}

        {/* Migration banner for owner+ */}
        {isOwner && org && <MigrationBanner organizationId={org._id} />}

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          open={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={async () => {
            setIsDeleting(true);
            try {
              await bulkRemove({ ids: Array.from(selectedProducts) as Id<"products">[] });
              setSelectedProducts(new Set());
              setDeleteMode(false);
              setShowConfirmDialog(false);
            } catch (err) {
              alert(err instanceof Error ? err.message : "Gagal menghapus produk");
            } finally {
              setIsDeleting(false);
            }
          }}
          title="Hapus Produk?"
          message={`Anda akan menghapus ${selectedProducts.size} produk beserta semua transaksinya. Tindakan ini tidak dapat dibatalkan.`}
          confirmText="Hapus Produk"
          cancelText="Batal"
          variant="danger"
          loading={isDeleting}
        />
      </main>
    </PageTransition>
  );
}

function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "warning";
}) {
  return (
    <div className="card px-4 py-3">
      <div className="stencil mb-1" style={{ fontSize: "9px" }}>
        {label}
      </div>
      <div
        className={`mono-num text-lg font-semibold ${
          variant === "warning" ? "text-copper" : "text-carbon-50"
        }`}
      >
        {value.toLocaleString("id-ID")}
      </div>
    </div>
  );
}

function MigrationBanner({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const needsMigration = useQuery(api.organizations.needsMigration);
  const migrate = useMutation(api.organizations.migrate);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "warning";
    message: string;
  } | null>(null);

  // Don't show if no migration needed or still loading
  if (needsMigration === undefined || needsMigration === false) return null;
  // Hide after showing result for a moment
  if (result && result.type === "success") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mt-8 card border-sage/20 p-4 flex items-center gap-3"
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
          <p className="text-sm text-sage">{result.message}</p>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (result && result.type === "warning") {
    return (
      <div className="mt-8 card border-copper/20 p-4 flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-copper/15 border border-copper/30 flex items-center justify-center flex-shrink-0">
          <span className="text-copper text-xs font-bold">!</span>
        </div>
        <p className="text-sm text-copper">{result.message}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 card border-copper/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div>
        <p className="text-sm text-carbon-100">Migrasi data lama?</p>
        <p className="text-xs text-carbon-400 mt-0.5">
          Pindahkan produk & transaksi tanpa organisasi ke organisasi ini.
        </p>
      </div>
      <Button
        size="sm"
        loading={migrating}
        onClick={async () => {
          setMigrating(true);
          try {
            const res = await migrate({ organizationId });
            setResult({
              type: "success",
              message: `Berhasil memigrasikan ${res.migrated} produk ke organisasi ini.`,
            });
          } catch (err) {
            setResult({
              type: "warning",
              message:
                err instanceof Error
                  ? err.message
                  : "Migrasi gagal. Coba lagi nanti.",
            });
          } finally {
            setMigrating(false);
          }
        }}
      >
        Migrasi
      </Button>
    </motion.div>
  );
}
