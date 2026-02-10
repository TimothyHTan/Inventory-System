"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const orgs = useQuery(
    api.organizations.list,
    isAuthenticated ? {} : "skip"
  );

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (orgs === undefined) return; // Still loading

    if (orgs.length > 0) {
      // Redirect to the first org's dashboard
      const firstOrg = orgs[0];
      if (firstOrg) {
        router.replace(`/org/${firstOrg.slug}/dashboard`);
      }
    } else {
      // No orgs — go to onboarding
      router.replace("/onboarding");
    }
  }, [authLoading, isAuthenticated, orgs, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-copper/30 border-t-copper rounded-full animate-spin" />
    </div>
  );
}
