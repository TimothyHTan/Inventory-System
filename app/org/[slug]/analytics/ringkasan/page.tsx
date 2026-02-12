"use client";

import { useState } from "react";
import { useOrganization } from "@/components/OrganizationProvider";
import { useAnalyticsQuery } from "@/hooks/useAnalyticsQuery";
import { api } from "@/convex/_generated/api";
import { formatNumber, formatDate } from "@/lib/utils";
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { motion } from "motion/react";

export default function RingkasanPage() {
  const { org } = useOrganization();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const { startDate, endDate } = getDateRange(dateRange);

  const { data, isLoading, isRefreshing, lastUpdated, refresh, error } =
    useAnalyticsQuery(
      api.analytics.getSummary,
      org
        ? { organizationId: org._id, startDate, endDate }
        : "skip",
      { pollInterval: 5 * 60 * 1000 }
    );

  if (!isLoading && !data) {
    return (
      <>
        <AnalyticsHeader
          title="Ringkasan Analitik"
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
        />
        <EmptyState
          message="Data analitik belum tersedia"
          suggestion={
            error ?? "Periksa koneksi Convex/auth lalu coba refresh halaman."
          }
        />
      </>
    );
  }

  return (
    <>
      <AnalyticsHeader
        title="Ringkasan Analitik"
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
            label="Total Produk"
            value={data.totalProducts}
            index={0}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <MetricCard
            label="Total Stok"
            value={data.totalStock}
            index={1}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <MetricCard
            label="Transaksi Periode Ini"
            value={data.transactionsInPeriod}
            index={2}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 17l9.2-9.2M17 17V7H7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <MetricCard
            label="Stok Rendah"
            value={data.lowStockCount}
            index={3}
            variant={data.lowStockCount > 0 ? "warning" : "default"}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 9v4m0 4h.01M12 3l9.5 16.5H2.5L12 3z"
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

      {/* Trend chart + Stock distribution row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        {/* Trend chart (2/3 width) */}
        <ChartContainer
          title="Tren Transaksi"
          isLoading={isLoading}
          isEmpty={!data?.trendData?.length}
          className="lg:col-span-2"
        >
          {data?.trendData && data.trendData.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trendData}>
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
                  <Line
                    type="monotone"
                    dataKey="masuk"
                    stroke="#7B9E6B"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="keluar"
                    stroke="#C75C5C"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartContainer>

        {/* Stock distribution (1/3 width) */}
        <div className="card p-5">
          <div className="stencil mb-4" style={{ fontSize: "9px" }}>
            Distribusi Stok
          </div>
          {isLoading || !data ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-carbon-700 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <StockStatusCard
                label="Kosong"
                count={data.stockDistribution.empty}
                total={data.totalProducts}
                color="rust"
                index={0}
              />
              <StockStatusCard
                label="Rendah"
                count={data.stockDistribution.low}
                total={data.totalProducts}
                color="copper"
                index={1}
              />
              <StockStatusCard
                label="Normal"
                count={data.stockDistribution.normal}
                total={data.totalProducts}
                color="sage"
                index={2}
              />
            </div>
          )}
        </div>
      </div>

      {/* Top 5 Products table */}
      <ChartContainer
        title="Top 5 Produk Paling Aktif"
        isLoading={isLoading}
        isEmpty={!data?.topProducts?.length}
      >
        {data?.topProducts && data.topProducts.length > 0 && (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="text-left border-b border-carbon-700/60">
                  <th className="px-5 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium">
                    Produk
                  </th>
                  <th className="px-3 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium text-right">
                    Total TX
                  </th>
                  <th className="px-3 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium text-right">
                    Masuk
                  </th>
                  <th className="px-3 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium text-right">
                    Keluar
                  </th>
                  <th className="px-5 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium text-right">
                    Stok
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((p) => (
                  <tr
                    key={p.name}
                    className="border-b border-carbon-700/30 last:border-0"
                  >
                    <td className="px-5 py-3 text-sm text-carbon-100">
                      {p.name}
                    </td>
                    <td className="px-3 py-3 mono-num text-sm text-carbon-200 text-right">
                      {formatNumber(p.totalTx)}
                    </td>
                    <td className="px-3 py-3 mono-num text-sm text-sage text-right">
                      {formatNumber(p.masuk)}
                    </td>
                    <td className="px-3 py-3 mono-num text-sm text-rust text-right">
                      {formatNumber(p.keluar)}
                    </td>
                    <td className="px-5 py-3 mono-num text-sm text-copper font-medium text-right">
                      {formatNumber(p.currentStock)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartContainer>

      {/* Empty state when no data at all */}
      {data &&
        data.totalProducts === 0 &&
        data.transactionsInPeriod === 0 && (
          <EmptyState
            message="Belum ada data dalam periode ini"
            suggestion="Coba perluas rentang tanggal atau tambahkan produk terlebih dahulu"
          />
        )}
    </>
  );
}

function StockStatusCard({
  label,
  count,
  total,
  color,
  index,
}: {
  label: string;
  count: number;
  total: number;
  color: "rust" | "copper" | "sage";
  index: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const colorMap = {
    rust: {
      bg: "bg-rust/10",
      border: "border-rust/20",
      bar: "bg-rust",
      text: "text-rust",
    },
    copper: {
      bg: "bg-copper/10",
      border: "border-copper/20",
      bar: "bg-copper",
      text: "text-copper",
    },
    sage: {
      bg: "bg-sage/10",
      border: "border-sage/20",
      bar: "bg-sage",
      text: "text-sage",
    },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`${c.bg} border ${c.border} rounded-sm px-3 py-2.5`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-carbon-300">
          {label}
        </span>
        <span className={`mono-num text-sm font-semibold ${c.text}`}>
          {count}
        </span>
      </div>
      <div className="h-1 bg-carbon-900/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full ${c.bar} rounded-full`}
        />
      </div>
    </motion.div>
  );
}
