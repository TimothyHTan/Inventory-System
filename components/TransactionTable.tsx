"use client";

import { motion, AnimatePresence } from "motion/react";
import { formatDate, formatNumber } from "@/lib/utils";
import { Doc } from "@/convex/_generated/dataModel";

interface TransactionTableProps {
  transactions: Doc<"transactions">[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
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
              <span className="text-copper">Sisa</span>
            </th>
          </tr>
        </thead>

        <tbody>
          <AnimatePresence mode="popLayout">
            {transactions.map((tx, i) => (
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
                className="ledger-line group hover:bg-carbon-800/40 transition-colors"
              >
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
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
