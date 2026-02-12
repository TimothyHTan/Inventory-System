"use client";

import { useState } from "react";
import { useOrganization } from "@/components/OrganizationProvider";
import { useAnalyticsQuery } from "@/hooks/useAnalyticsQuery";
import { api } from "@/convex/_generated/api";
import { formatNumber } from "@/lib/utils";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

export default function ProdukAnalyticsPage() {
  const { org } = useOrganization();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const { startDate, endDate } = getDateRange(dateRange);

  const { data, isLoading, isRefreshing, lastUpdated, refresh, error } =
    useAnalyticsQuery(
      api.analytics.getProductAnalytics,
      org
        ? { organizationId: org._id, startDate, endDate }
        : "skip",
      { pollInterval: 10 * 60 * 1000 }
    );

  if (!isLoading && !data) {
    return (
      <>
        <AnalyticsHeader
          title="Analitik Produk"
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
        />
        <EmptyState
          message="Data analitik produk belum tersedia"
          suggestion={
            error ?? "Periksa koneksi Convex/auth lalu coba refresh halaman."
          }
        />
      </>
    );
  }

  const distributionData = data
    ? [
        { name: "Kosong", value: data.stockDistribution.empty, color: "#C75C5C" },
        { name: "Rendah", value: data.stockDistribution.low, color: "#D4915C" },
        { name: "Normal", value: data.stockDistribution.normal, color: "#7B9E6B" },
      ]
    : [];

  return (
    <>
      <AnalyticsHeader
        title="Analitik Produk"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />

      {/* Metric cards */}
      {isLoading || !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
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
            label="Stok Kosong"
            value={data.emptyStock}
            index={1}
            variant={data.emptyStock > 0 ? "danger" : "default"}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2v20M2 12h20"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity={0.3}
                />
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M8 8l8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
          <MetricCard
            label="Bergerak Lambat"
            value={data.slowMovingCount}
            index={2}
            variant={data.slowMovingCount > 0 ? "warning" : "default"}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M12 7v5l3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
        </div>
      )}

      {/* Distribution chart */}
      <ChartContainer
        title="Distribusi Status Stok"
        isLoading={isLoading}
        isEmpty={!data || data.totalProducts === 0}
        className="mb-6"
      >
        {distributionData.length > 0 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={distributionData}
                layout="vertical"
                margin={{ left: 0, right: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(212,145,92,0.08)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="#5C5548"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#5C5548"
                  fontSize={11}
                  fontFamily="var(--font-body)"
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1C1915",
                    border: "1px solid rgba(212,145,92,0.2)",
                    borderRadius: "2px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [
                    `${formatNumber(Number(value ?? 0))} produk`,
                    "",
                  ]}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 2, 2, 0]}
                  maxBarSize={24}
                  isAnimationActive={false}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Slow moving products */}
        <ChartContainer
          title="Stok Bergerak Lambat"
          isLoading={isLoading}
          isEmpty={!data?.slowMoving?.length}
        >
          {data?.slowMoving && data.slowMoving.length > 0 ? (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="text-left border-b border-carbon-700/60">
                    <th className="px-5 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium">
                      Produk
                    </th>
                    <th className="px-3 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium text-right">
                      Stok
                    </th>
                    <th className="px-3 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium text-right">
                      TX Terakhir
                    </th>
                    <th className="px-5 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.slowMoving.map((p) => (
                    <tr
                      key={p.name}
                      className="border-b border-carbon-700/30 last:border-0"
                    >
                      <td className="px-5 py-3 text-sm text-carbon-100">
                        {p.name}
                      </td>
                      <td className="px-3 py-3 mono-num text-sm text-copper text-right">
                        {formatNumber(p.currentStock)}
                      </td>
                      <td className="px-3 py-3 text-xs text-carbon-400 text-right">
                        {p.lastTransactionDays >= 999
                          ? "Belum ada"
                          : `${p.lastTransactionDays}h lalu`}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Badge variant="muted">Tidak Aktif</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            data && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-8 h-8 rounded-full bg-sage/15 border border-sage/30 flex items-center justify-center mb-3">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="text-sage"
                  >
                    <path
                      d="M3.5 7l2.5 2.5 4.5-4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-xs text-sage">Semua produk aktif!</p>
              </div>
            )
          )}
        </ChartContainer>

        {/* Top 10 by stock */}
        <ChartContainer
          title="Top 10 Produk (Stok Tertinggi)"
          isLoading={isLoading}
          isEmpty={!data?.topProductsByStock?.length}
        >
          {data?.topProductsByStock && data.topProductsByStock.length > 0 && (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full min-w-[350px]">
                <thead>
                  <tr className="text-left border-b border-carbon-700/60">
                    <th className="px-5 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium">
                      Produk
                    </th>
                    <th className="px-3 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium text-right">
                      Stok
                    </th>
                    <th className="px-5 pb-2 text-[10px] uppercase tracking-wider text-carbon-400 font-medium text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProductsByStock.map((p) => (
                    <tr
                      key={p.name}
                      className="border-b border-carbon-700/30 last:border-0"
                    >
                      <td className="px-5 py-3 text-sm text-carbon-100">
                        {p.name}
                      </td>
                      <td className="px-3 py-3 mono-num text-sm text-copper font-medium text-right">
                        {formatNumber(p.stock)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Badge
                          variant={
                            p.status === "empty"
                              ? "rust"
                              : p.status === "low"
                                ? "copper"
                                : "sage"
                          }
                        >
                          {p.status === "empty"
                            ? "Kosong"
                            : p.status === "low"
                              ? "Rendah"
                              : "Normal"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartContainer>
      </div>

      {data && data.totalProducts === 0 && (
        <EmptyState
          message="Belum ada produk"
          suggestion="Tambahkan produk dari halaman Dashboard untuk melihat analitik"
        />
      )}
    </>
  );
}
