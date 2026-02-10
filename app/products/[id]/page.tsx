"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy /products/[id] route — redirects to org-scoped via root */
export default function LegacyProductDetailPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin" />
    </div>
  );
}
