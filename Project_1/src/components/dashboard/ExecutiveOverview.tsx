import type { DashboardData, SummaryRangeKey } from "@/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkline } from "./Sparkline";
import { ComboChart } from "./ComboChart";
import { StackedBarChart } from "./StackedBarChart";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { TrendingUp } from "lucide-react";
import { useFilteredData } from "@/hooks/useFilteredData";
import { EmptyState } from "@/components/ui/empty-state";
import { useFilters } from "@/components/dashboard/FilterContext";
import {
  RANGE_LABELS,
  getSeriesForRange,
  getPreviousSeries,
  computeKpiDeltas,
  type KpiKey as TrendableKpiKey,
} from "../../lib/transformations";

interface ExecutiveOverviewProps {
  data: DashboardData;
  range: SummaryRangeKey;
  onRangeChange: (range: SummaryRangeKey) => void;
}

const KPI_CONFIG = [
  { key: "sessions", label: "Sessions", formatter: (value: number) => formatNumber(value) },
  { key: "purchases", label: "Purchases", formatter: (value: number) => formatNumber(value) },
  { key: "revenue", label: "Revenue", formatter: (value: number) => formatCurrency(value / 1_00_000, 1) + " L" },
  { key: "purchaseRate", label: "Purchase Rate", formatter: (value: number) => formatPercent(value, 1) },
  { key: "aov", label: "Average Order Value", formatter: (value: number) => formatCurrency(value, 0) },
  { key: "ltvToCac", label: "LTV : CAC", formatter: (value: number) => value.toFixed(2) },
] as const;

type KpiKey = (typeof KPI_CONFIG)[number]["key"];
type TrendableKpi = TrendableKpiKey;

export function ExecutiveOverview({ data, range, onRangeChange }: ExecutiveOverviewProps) {
  // Use centralized filter hook instead of inline filtering logic
  const { monthlySeries: filteredMonthlySeries, channelRatio, isEmpty } = useFilteredData(data);
  const { resetFilters } = useFilters();
  
  // Show empty state if filters return no data
  if (isEmpty) {
    return (
      <section className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-secondary bg-foreground text-background inline-block px-3 py-1">
              Project 1 · India Funnel
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase tracking-tight">
              Growth Analytics Command Center
            </h1>
          </div>
        </div>
        <EmptyState onReset={resetFilters} />
      </section>
    );
  }
  
  const stats = data.summaryByRange[range];
  
  // Apply filtering to time-sliced series using the same ratios
  const rawSeries = getSeriesForRange(data, range);
  const rawPreviousSeries = getPreviousSeries(data, range);
  
  // Filter series data proportionally
  const series = rawSeries.map((month, idx) => {
    const filtered = filteredMonthlySeries.find(m => m.month === month.month) || filteredMonthlySeries[idx];
    return filtered || month;
  });
  
  const previousSeries = rawPreviousSeries.map((month, idx) => {
    // Apply same ratio to previous series
    return {
      ...month,
      sessions: Math.round(month.sessions * channelRatio),
      purchases: Math.round(month.purchases * channelRatio),
      revenue: Math.round(month.revenue * channelRatio * 100) / 100,
      newCustomers: Math.round(month.newCustomers * channelRatio),
    };
  });
  
  const deltas = computeKpiDeltas(series, previousSeries);

  // Removed duplicate headline cards as they're redundant with KPI cards below

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-secondary bg-foreground text-background inline-block px-3 py-1">
            Project 1 · India Funnel
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-tight">
            Growth Analytics Command Center
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl font-medium">
            Monitor acquisition, activation, and retention in one glance. Filters drive every card so the data stays audit-ready.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-secondary px-4 py-3 border-3 border-foreground shadow-brutal-sm">
          <TrendingUp className="text-foreground size-6" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-foreground/70">Time window</p>
            <Select value={range} onValueChange={value => onRangeChange(value as SummaryRangeKey)}>
              <SelectTrigger className="mt-1 bg-background">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RANGE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {KPI_CONFIG.map((kpi, index) => {
          const kpiColors = ['#4ECDC4', '#A855F7', '#FF6B6B', '#FFE135', '#3B82F6', '#10B981'];
          let delta: number | undefined;
          if (kpi.key !== "ltvToCac") {
            delta = deltas[kpi.key as TrendableKpi];
          }
          const value = stats[kpi.key as keyof typeof stats] as number;
          return (
            <div 
              key={kpi.label}
              className="border-3 border-foreground shadow-brutal p-4 hover-brutal cursor-pointer transition-all"
              style={{ backgroundColor: kpiColors[index % kpiColors.length] }}
            >
              <p className="text-sm font-bold uppercase tracking-wide text-foreground/80">{kpi.label}</p>
              <p className="text-4xl font-black text-foreground mt-1">{kpi.formatter(value)}</p>
              {typeof delta === "number" && !Number.isNaN(delta) ? (
                <p className={`text-sm font-black uppercase tracking-wide mt-2 ${delta >= 0 ? "text-foreground" : "text-foreground"}`}>
                  {delta >= 0 ? "▲" : "▼"} {formatPercent(delta, 1)} vs prior
                </p>
              ) : kpi.key === "ltvToCac" ? (
                <p className="text-xs font-bold text-foreground/70 mt-2">CAC derived from synthetic spend table</p>
              ) : null}
              {kpi.key !== "ltvToCac" && (
                <div className="mt-3 border-2 border-foreground bg-background p-2">
                  {kpi.key === "revenue" ? (
                    <Sparkline 
                      values={series.map(point => point.revenue)} 
                      labels={series.map(point => point.label)}
                      dataLabel="Revenue"
                      colorClass="text-chart-1" 
                    />
                  ) : kpi.key === "sessions" ? (
                    <Sparkline 
                      values={series.map(point => point.sessions)} 
                      labels={series.map(point => point.label)}
                      dataLabel="Sessions"
                      colorClass="text-chart-5" 
                    />
                  ) : kpi.key === "purchases" ? (
                    <Sparkline 
                      values={series.map(point => point.purchases)} 
                      labels={series.map(point => point.label)}
                      dataLabel="Purchases"
                      colorClass="text-chart-4" 
                    />
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New chart sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Purchases Trend</CardTitle>
            <CardDescription>Monthly performance (bars = revenue, line = purchases)</CardDescription>
          </CardHeader>
          <CardContent>
            <ComboChart
              data={series.map(point => ({
                label: point.label,
                revenue: point.revenue,
                purchases: point.purchases,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>New vs Returning Users</CardTitle>
            <CardDescription>Session distribution by user type</CardDescription>
          </CardHeader>
          <CardContent>
            <StackedBarChart
              data={series.map(point => ({
                label: point.label,
                newSessions: point.newCustomers,
                returningSessions: Math.max(0, (point.sessions || 0) - point.newCustomers),
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
