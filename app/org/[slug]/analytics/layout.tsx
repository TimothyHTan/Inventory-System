"use client";

import { useOrganization } from "@/components/OrganizationProvider";
import { PageTransition } from "@/components/motion/PageTransition";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Ringkasan", segment: "ringkasan" },
  { label: "Produk", segment: "produk" },
  { label: "Transaksi", segment: "transaksi" },
];

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { org, isManager, isLoading } = useOrganization();
  const pathname = usePathname();

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
          Halaman analitik hanya tersedia untuk Manajer ke atas.
        </p>
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Tab navigation */}
        <div className="flex items-center gap-1 mb-6 border-b border-carbon-700/40 pb-px overflow-x-auto">
          {tabs.map((tab) => {
            const href = `/org/${org.slug}/analytics/${tab.segment}`;
            const isActive = pathname.includes(`/analytics/${tab.segment}`);

            return (
              <Link
                key={tab.segment}
                href={href}
                className={cn(
                  "relative px-4 py-2.5 text-xs uppercase tracking-wider whitespace-nowrap transition-colors",
                  isActive
                    ? "text-copper"
                    : "text-carbon-400 hover:text-carbon-200"
                )}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-copper" />
                )}
              </Link>
            );
          })}
        </div>

        {children}
      </main>
    </PageTransition>
  );
}
