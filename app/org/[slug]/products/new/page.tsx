"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization } from "@/components/OrganizationProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/motion/PageTransition";

export default function OrgNewProductPage() {
  const router = useRouter();
  const { org, canEdit, isLoading: orgLoading } = useOrganization();
  const createProduct = useMutation(api.products.create);

  const [name, setName] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if viewer
  if (!orgLoading && !canEdit) {
    router.push(org ? `/org/${org.slug}/dashboard` : "/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!org) return;

    if (!name.trim()) {
      setError("Nama produk harus diisi");
      return;
    }

    const stock = parseInt(initialStock) || 0;
    if (stock < 0) {
      setError("Stok awal tidak boleh negatif");
      return;
    }

    setLoading(true);
    try {
      await createProduct({
        name: name.trim(),
        initialStock: stock,
        description: description.trim() || undefined,
        organizationId: org._id,
      });
      router.push(`/org/${org.slug}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat produk");
    } finally {
      setLoading(false);
    }
  };

  if (orgLoading || !org) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-carbon-400 mb-6">
          <Link
            href={`/org/${org.slug}/dashboard`}
            className="hover:text-carbon-100 transition-colors"
          >
            Dashboard
          </Link>
          <span className="text-carbon-600">/</span>
          <span className="text-carbon-200">Produk Baru</span>
        </div>

        <div className="mb-6">
          <div className="stencil mb-1">Tambah</div>
          <h1 className="font-display text-2xl text-carbon-50">Produk Baru</h1>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Nama Produk"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Typhonium Plus"
              autoFocus
              required
            />

            <Input
              label="Stok Awal"
              type="number"
              min="0"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              placeholder="0"
            />

            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider text-carbon-300 font-medium">
                Deskripsi (opsional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Catatan tambahan"
                rows={3}
                className="w-full bg-carbon-800 border border-carbon-600/40 rounded-sm px-3 py-2 text-sm text-carbon-50 placeholder:text-carbon-400 focus:outline-none focus:border-copper/50 focus:ring-1 focus:ring-copper/20 transition-colors duration-150 resize-none"
              />
            </div>

            {error && (
              <div className="text-xs text-rust bg-rust/8 border border-rust/20 rounded-sm px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(`/org/${org.slug}/dashboard`)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button type="submit" loading={loading} className="flex-1">
                Buat Produk
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-carbon-700/30">
            <p className="text-[10px] text-carbon-500 leading-relaxed">
              <span className="text-carbon-400 font-medium">Tip:</span> Lihat
              sisa terakhir (SISA) di kartu stock kertas, lalu masukkan angka
              tersebut sebagai Stok Awal. Mulai catat transaksi baru secara
              digital dari sini.
            </p>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
