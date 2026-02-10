"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy /settings route — redirects to org-scoped settings via root */
export default function LegacySettingsPage() {
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
