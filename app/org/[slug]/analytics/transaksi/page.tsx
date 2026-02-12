"use client";

import { useState } from "react";
import { useOrganization } from "@/components/OrganizationProvider";
import { useAnalyticsQuery } from "@/hooks/useAnalyticsQuery";
import { api } from "@/convex/_generated/api";
import { formatNumber, formatDate, formatMonth } from "@/lib/utils";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import {
  MetricCard,
  MetricCardSkeleton,
} from "@/components/analytics/MetricCard";
import { ChartContainer } from "@/components/analytics/ChartContainer";
import { EmptyState } from "@/components/analytics/EmptyState";
import {
  DateRange,
  getDateRange,
} from "@/components/analytics/DateRangeSelect";
import { Badge } from "@/components/ui/Badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { motion } from "motion/react";
import Link from "next/link";

export default function TransaksiAnalyticsPage() {
  const { org } = useOrganization();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const { startDate, endDate } = getDateRange(dateRange);

  const { data, isLoading, isRefreshing, lastUpdated, refresh } =
    useAnalyticsQuery(
      api.analytics.getTransactionAnalytics,
      org
        ? { organizationId: org._id, startDate, endDate }
        : "skip",
      { pollInterval: 5 * 60 * 1000 }
    );

  return (
    <>
      <AnalyticsHeader
        title="Analitik Transaksi"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />

      {/* Metric cards */}
      {isLoading || !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard
            label="Total Transaksi"
            value={data.totalTransactions}
            index={0}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
          <MetricCard
            label="Total Masuk"
            value={data.totalMasuk}
            index={1}
            variant="success"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 19V5m0 14l-4-4m4 4l4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <MetricCard
            label="Total Keluar"
            value={data.totalKeluar}
            index={2}
            variant="danger"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14m0-14l-4 4m4-4l4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <MetricCard
            label="Perubahan Bersih"
            value={data.netChange}
            index={3}
            variant={
              data.netChange > 0
                ? "success"
                : data.netChange < 0
                  ? "danger"
                  : "default"
            }
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 3v18h18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 16l4-4 4 4 5-6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
        </div>
      )}

      {/* Area chart — daily trends */}
      <ChartContainer
        title="Masuk vs Keluar (Harian)"
        isLoading={isLoading}
        isEmpty={!data?.dailyTrends?.length}
        className="mb-6"
      >
        {data?.dailyTrends && data.dailyTrends.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyTrends}>
                <defs>
                  <linearGradient id="gradMasuk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7B9E6B" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7B9E6B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradKeluar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C75C5C" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#C75C5C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(212,145,92,0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => {
                    const parts = d.split("-");
                    return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
                  }}
                  stroke="#5C5548"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#5C5548"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1C1915",
                    border: "1px solid rgba(212,145,92,0.2)",
                    borderRadius: "2px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                  }}
                  labelFormatter={(d) => formatDate(String(d))}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    formatNumber(Number(value ?? 0)),
                    name === "masuk" ? "MASUK" : "KELUAR",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="masuk"
                  stroke="#7B9E6B"
                  strokeWidth={2}
                  fill="url(#gradMasuk)"
                />
                <Area
                  type="monotone"
                  dataKey="keluar"
                  stroke="#C75C5C"
                  strokeWidth={2}
                  fill="url(#gradKeluar)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        {/* Monthly bar chart */}
        <ChartContainer
          title="Transaksi per Bulan"
          isLoading={isLoading}
          isEmpty={!data?.monthlyData?.length}
        >
          {data?.monthlyData && data.monthlyData.length > 0 && (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(212,145,92,0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => {
                      const parts = m.split("-");
                      const months = [
                        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
                        "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
                      ];
                      return months[parseInt(parts[1]) - 1] || m;
                    }}
                    stroke="#5C5548"
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#5C5548"
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                    tickLine={false}
                    axisLine={false}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1C1915",
                      border: "1px solid rgba(212,145,92,0.2)",
                      borderRadius: "2px",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                    }}
                    labelFormatter={(m) => formatMonth(String(m))}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any) => [
                      formatNumber(Number(value ?? 0)),
                      name === "masukCount" ? "MASUK" : "KELUAR",
                    ]}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "masukCount" ? "MASUK" : "KELUAR"
                    }
                    wrapperStyle={{ fontSize: "10px", fontFamily: "var(--font-mono)" }}
                  />
                  <Bar
                    dataKey="masukCount"
                    fill="#7B9E6B"
                    fillOpacity={0.8}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="keluarCount"
                    fill="#C75C5C"
                    fillOpacity={0.8}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartContainer>

        {/* Monthly detail table */}
        <ChartContainer
          title="Detail Transaksi Bulanan"
          isLoading={isLoading}
          isEmpty={!data?.monthlyData?.length}
        >
          {data?.monthlyData && data.monthlyData.length > 0 && (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="text-left border-b border-carbon-700/60">
                    <th className="px-5 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium">
                      Bulan
                    </th>
                    <th className="px-3 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium text-right">
                      Masuk
                    </th>
                    <th className="px-3 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium text-right">
                      Keluar
                    </th>
                    <th className="px-5 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium text-right">
                      Bersih
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyData.map((m, i) => {
                    const net = m.masukQty - m.keluarQty;
                    return (
                      <motion.tr
                        key={m.month}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: i * 0.04,
                          duration: 0.25,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="border-b border-carbon-700/30 last:border-0"
                      >
                        <td className="px-5 py-3 text-sm text-carbon-100">
                          {formatMonth(m.month)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="mono-num text-sm text-sage">
                            {formatNumber(m.masukQty)}
                          </div>
                          <div className="text-[10px] text-carbon-500">
                            {m.masukCount} transaksi
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="mono-num text-sm text-rust">
                            {formatNumber(m.keluarQty)}
                          </div>
                          <div className="text-[10px] text-carbon-500">
                            {m.keluarCount} transaksi
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={`mono-num text-sm font-medium ${
                              net > 0
                                ? "text-sage"
                                : net < 0
                                  ? "text-rust"
                                  : "text-carbon-400"
                            }`}
                          >
                            {net > 0 ? "+" : ""}
                            {formatNumber(net)}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ChartContainer>
      </div>

      {/* Recent transactions */}
      <ChartContainer
        title="Transaksi Terbaru"
        isLoading={isLoading}
        isEmpty={!data?.recentTransactions?.length}
      >
        {data?.recentTransactions && data.recentTransactions.length > 0 && (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="text-left border-b border-carbon-700/60">
                  <th className="px-5 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium">
                    Tanggal
                  </th>
                  <th className="px-3 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium">
                    Produk
                  </th>
                  <th className="px-3 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium">
                    Tipe
                  </th>
                  <th className="px-3 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium text-right">
                    Jumlah
                  </th>
                  <th className="px-3 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium">
                    Keterangan
                  </th>
                  <th className="px-5 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium">
                    Dicatat Oleh
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((tx, i) => (
                  <motion.tr
                    key={tx._id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: i * 0.03,
                      duration: 0.25,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="border-b border-carbon-700/30 last:border-0"
                  >
                    <td className="px-5 py-3 mono-num text-xs text-carbon-300">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-3 py-3 text-sm text-carbon-100">
                      {org ? (
                        <Link
                          href={`/org/${org.slug}/products/${tx.productId}`}
                          className="hover:text-copper transition-colors"
                        >
                          {tx.productName}
                        </Link>
                      ) : (
                        tx.productName
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant={tx.type === "in" ? "sage" : "rust"}
                      >
                        {tx.type === "in" ? "Masuk" : "Keluar"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 mono-num text-sm text-right">
                      <span
                        className={
                          tx.type === "in" ? "text-sage" : "text-rust"
                        }
                      >
                        {tx.type === "in" ? "+" : "-"}
                        {formatNumber(tx.quantity)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-carbon-400 max-w-[150px] truncate">
                      {tx.description}
                    </td>
                    <td className="px-5 py-3 text-xs text-carbon-400">
                      {tx.creatorName}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartContainer>

      {data && data.totalTransactions === 0 && (
        <EmptyState
          message="Belum ada transaksi dalam periode ini"
          suggestion="Coba perluas rentang tanggal"
        />
      )}
    </>
  );
}
