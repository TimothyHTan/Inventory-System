"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization } from "@/components/OrganizationProvider";
import { motion } from "motion/react";

export function LogisticNotificationBoard() {
  const { org, isLogistic } = useOrganization();

  const pendingCount = useQuery(
    api.stockRequests.pendingCount,
    org && isLogistic ? { organizationId: org._id } : "skip"
  );

  // Only render for logistic+ with pending requests
  if (!isLogistic || !org || !pendingCount || pendingCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="mt-6"
    >
      <Link href={`/org/${org.slug}/requests`}>
        <div className="card border-copper/20 p-4 flex items-center justify-between gap-3 hover:border-copper/40 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            {/* Notification icon */}
            <div className="w-8 h-8 rounded-sm bg-copper/10 border border-copper/20 flex items-center justify-center flex-shrink-0">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="text-copper"
              >
                <path
                  d="M8 2a4 4 0 0 0-4 4v2.5L2.5 11h11L12 8.5V6a4 4 0 0 0-4-4zM6.5 12.5a1.5 1.5 0 0 0 3 0"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-carbon-100 font-medium">
                {pendingCount} permintaan stok menunggu konfirmasi
              </p>
              <p className="text-xs text-carbon-400 mt-0.5">
                Klik untuk melihat dan memproses permintaan
              </p>
            </div>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-carbon-400 group-hover:text-copper transition-colors flex-shrink-0"
          >
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Link>
    </motion.div>
  );
}
