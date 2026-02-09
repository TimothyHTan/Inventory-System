"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/Badge";
import { PageTransition } from "@/components/motion/PageTransition";

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.current);
  const users = useQuery(api.users.list);
  const setRole = useMutation(api.users.setRole);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Redirect non-admin users
  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      router.push("/dashboard");
    }
  }, [currentUser, router]);

  const handleRoleChange = async (
    userId: Id<"users">,
    role: "admin" | "staff"
  ) => {
    try {
      await setRole({ userId, role });
    } catch {
      // Permission error
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <PageTransition>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <div className="stencil mb-1">Pengaturan</div>
            <h1 className="font-display text-2xl text-carbon-50">
              Manajemen Pengguna
            </h1>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-carbon-600/40">
                  <th className="text-left py-3 px-4 stencil font-semibold">
                    Nama
                  </th>
                  <th className="text-left py-3 px-4 stencil font-semibold">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 stencil font-semibold">
                    Role
                  </th>
                  <th className="text-right py-3 px-4 stencil font-semibold">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {users === undefined ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="ledger-line">
                      <td className="py-3 px-4">
                        <div className="h-4 bg-carbon-700 rounded w-24 animate-pulse" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 bg-carbon-700 rounded w-40 animate-pulse" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 bg-carbon-700 rounded w-16 animate-pulse" />
                      </td>
                      <td className="py-3 px-4" />
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-8 text-carbon-400 text-sm"
                    >
                      Tidak ada pengguna
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isCurrentUser = u._id === currentUser?._id;
                    return (
                      <tr
                        key={u._id}
                        className="ledger-line hover:bg-carbon-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-carbon-100">
                          <div className="flex items-center gap-2">
                            {u.name || "—"}
                            {isCurrentUser && (
                              <span className="text-[9px] text-carbon-500 font-mono">
                                (anda)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-carbon-300 font-mono text-xs">
                          {u.email || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              u.role === "admin" ? "copper" : "muted"
                            }
                          >
                            {u.role || "belum diatur"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isCurrentUser && (
                            <select
                              value={u.role || "staff"}
                              onChange={(e) =>
                                handleRoleChange(
                                  u._id,
                                  e.target.value as "admin" | "staff"
                                )
                              }
                              className="bg-carbon-800 border border-carbon-600/30 rounded-sm px-2 py-1 text-xs text-carbon-200 focus:outline-none focus:border-copper/40"
                            >
                              <option value="staff">Staff</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Info section */}
          <div className="mt-6 card p-4">
            <div className="stencil mb-2" style={{ fontSize: "9px" }}>
              INFORMASI
            </div>
            <div className="space-y-2 text-xs text-carbon-400">
              <p>
                <span className="text-copper font-medium">Admin</span> — dapat
                menambah/menghapus produk dan mengelola pengguna.
              </p>
              <p>
                <span className="text-carbon-200 font-medium">Staff</span> —
                dapat melihat produk dan menambah transaksi.
              </p>
            </div>
          </div>
        </main>
      </PageTransition>
    </div>
  );
}
