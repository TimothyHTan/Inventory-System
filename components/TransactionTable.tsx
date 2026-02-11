"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { formatDate, formatNumber } from "@/lib/utils";
import { Doc } from "@/convex/_generated/dataModel";
import { ROLE_TIER } from "@/components/OrganizationProvider";

const SIXTY_MINUTES_MS = 60 * 60 * 1000;

interface TransactionTableProps {
  transactions: Doc<"transactions">[];
  deleteMode?: boolean;
  selectedTransactions?: Set<string>;
  onToggleSelect?: (id: string) => void;
  userRole?: string;
  onDeleteSingle?: (id: string) => void;
  deletingId?: string | null;
}

/** Format remaining ms as "Xm Xs" */
function formatCountdown(ms: number): string {
  if (ms <= 0) return "0m";
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec}d`;
  return `${sec}d`;
}

/** Format deadline as HH:MM */
function formatDeadline(createdAt: number): string {
  const deadline = new Date(createdAt + SIXTY_MINUTES_MS);
  return `${String(deadline.getHours()).padStart(2, "0")}:${String(deadline.getMinutes()).padStart(2, "0")}`;
}

export function TransactionTable({
  transactions,
  deleteMode = false,
  selectedTransactions = new Set(),
  onToggleSelect,
  userRole,
  onDeleteSingle,
  deletingId,
}: TransactionTableProps) {
  // Tick state to re-render countdowns every 15 seconds
  const [, setTick] = useState(0);

  const roleTier = userRole ? ROLE_TIER[userRole] ?? 0 : 0;
  const isLogistic = roleTier >= ROLE_TIER["logistic"];
  const isManager = roleTier >= ROLE_TIER["manager"];

  // Whether any row could show individual delete (not in bulk delete mode)
  const showIndividualDelete = !deleteMode && isLogistic && !!onDeleteSingle;

  // Keep countdown ticking for logistic users (not managers who always see delete)
  useEffect(() => {
    if (!isLogistic || isManager || deleteMode) return;
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, [isLogistic, isManager, deleteMode]);

  const canDeleteRow = useCallback(
    (tx: Doc<"transactions">) => {
      if (!isLogistic) return false;
      if (isManager) return true;
      // Logistic: only within 60-min window
      return Date.now() - tx.createdAt < SIXTY_MINUTES_MS;
    },
    [isLogistic, isManager]
  );

  if (transactions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-block mb-3">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            className="text-carbon-600"
          >
            <rect
              x="6"
              y="6"
              width="28"
              height="28"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <path
              d="M14 16h12M14 20h8M14 24h10"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-sm text-carbon-400">Belum ada transaksi</p>
        <p className="text-xs text-carbon-500 mt-1">
          Klik &quot;Tambah Transaksi&quot; untuk memulai
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        {/* Header — mimics paper card column headers */}
        <thead>
          <tr className="border-b-2 border-carbon-600/40">
            <AnimatePresence initial={false}>
              {deleteMode && (
                <motion.th
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "40px", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="text-left py-2.5 px-3 overflow-hidden"
                />
              )}
            </AnimatePresence>
            <th className="text-left py-2.5 px-3 stencil font-semibold w-28">
              Tanggal
            </th>
            <th className="text-left py-2.5 px-3 stencil font-semibold">
              Keterangan
            </th>
            <th className="text-right py-2.5 px-3 stencil font-semibold w-24">
              <span className="text-sage">Masuk</span>
            </th>
            <th className="text-right py-2.5 px-3 stencil font-semibold w-24">
              <span className="text-rust">Keluar</span>
            </th>
            <th className="text-right py-2.5 px-3 stencil font-semibold w-28">
              <span className="text-copper">Jumlah</span>
            </th>
            {showIndividualDelete && (
              <th className="w-20 py-2.5 px-3" />
            )}
          </tr>
        </thead>

        <tbody>
          <AnimatePresence mode="popLayout">
            {transactions.map((tx, i) => {
              const isSelected = selectedTransactions.has(tx._id);
              const canDelete = canDeleteRow(tx);
              const remaining = tx.createdAt + SIXTY_MINUTES_MS - Date.now();
              const isBeingDeleted = deletingId === tx._id;

              return (
                <motion.tr
                  key={tx._id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: i * 0.02,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`ledger-line group transition-colors ${
                    deleteMode ? "cursor-pointer" : ""
                  } ${
                    isSelected ? "bg-copper/10" : "hover:bg-carbon-800/40"
                  }`}
                  onClick={() => {
                    if (deleteMode && onToggleSelect) {
                      onToggleSelect(tx._id);
                    }
                  }}
                >
                  {/* CHECKBOX (bulk delete mode) */}
                  <AnimatePresence initial={false}>
                    {deleteMode && (
                      <motion.td
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "40px", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{
                          duration: 0.3,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="py-2.5 px-3 overflow-hidden"
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-copper border-copper"
                              : "bg-carbon-800 border-carbon-600"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                            >
                              <path
                                d="M1.5 5l2 2L8.5 2.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-carbon-900"
                              />
                            </svg>
                          )}
                        </div>
                      </motion.td>
                    )}
                  </AnimatePresence>

                  {/* DATE */}
                  <td className="py-2.5 px-3 font-mono text-xs text-carbon-300">
                    {formatDate(tx.date)}
                  </td>

                  {/* KETERANGAN */}
                  <td className="py-2.5 px-3 text-carbon-100">
                    {tx.description}
                  </td>

                  {/* MASUK */}
                  <td className="py-2.5 px-3 text-right mono-num">
                    {tx.type === "in" ? (
                      <span className="text-sage font-medium">
                        {formatNumber(tx.quantity)}
                      </span>
                    ) : (
                      <span className="text-carbon-700">&mdash;</span>
                    )}
                  </td>

                  {/* KELUAR */}
                  <td className="py-2.5 px-3 text-right mono-num">
                    {tx.type === "out" ? (
                      <span className="text-rust font-medium">
                        {formatNumber(tx.quantity)}
                      </span>
                    ) : (
                      <span className="text-carbon-700">&mdash;</span>
                    )}
                  </td>

                  {/* SISA */}
                  <td className="py-2.5 px-3 text-right mono-num font-semibold text-carbon-50">
                    {formatNumber(tx.runningBalance)}
                  </td>

                  {/* Individual delete action (non-bulk mode) */}
                  {showIndividualDelete && (
                    <td className="py-2.5 px-2 text-right">
                      {canDelete ? (
                        <div className="flex items-center justify-end gap-2">
                          {/* Countdown for logistic (not manager+) */}
                          {!isManager && remaining > 0 && (
                            <span
                              className="text-[9px] font-mono text-carbon-500 whitespace-nowrap"
                              title={`Dapat dihapus sampai ${formatDeadline(tx.createdAt)}`}
                            >
                              {formatCountdown(remaining)}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSingle?.(tx._id);
                            }}
                            disabled={isBeingDeleted}
                            className="text-carbon-500 hover:text-rust transition-colors p-1 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Hapus transaksi"
                          >
                            {isBeingDeleted ? (
                              <div className="w-3.5 h-3.5 border border-rust/40 border-t-rust rounded-full animate-spin" />
                            ) : (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                              >
                                <path
                                  d="M3 4h8M5.5 4V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M10 4v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      ) : null}
                    </td>
                  )}
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
