"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Navbar } from "@/components/Navbar";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { PageTransition } from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch data
  const user = useQuery(api.users.current);
  const products = useQuery(
    api.products.search,
    isAuthenticated ? { searchQuery: search } : "skip"
  );

  const isAdmin = user?.role === "admin";

  // Loading state
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin" />
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
    <div className="min-h-screen">
      <Navbar />

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

            {isAdmin && (
              <Link href="/products/new">
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
            // Loading skeleton
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
            // Empty state
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
                />
              ))}
            </div>
          )}

          {/* First-time admin setup hint */}
          {user && !user.role && (
            <FirstAdminBanner />
          )}
        </main>
      </PageTransition>
    </div>
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

function FirstAdminBanner() {
  const setupAdmin = useMutationSafe();

  return (
    <div className="mt-8 card border-copper/20 p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-carbon-100">
          Anda adalah pengguna pertama.
        </p>
        <p className="text-xs text-carbon-400 mt-0.5">
          Jadikan diri Anda admin untuk mengelola produk dan pengguna.
        </p>
      </div>
      <Button size="sm" onClick={setupAdmin}>
        Jadikan Admin
      </Button>
    </div>
  );
}

function useMutationSafe() {
  const setupFirstAdmin = useMutation(api.users.setupFirstAdmin);
  return async () => {
    try {
      await setupFirstAdmin();
      window.location.reload();
    } catch {
      // Admin already exists
    }
  };
}

// Need this import at module level
import { useMutation } from "convex/react";
