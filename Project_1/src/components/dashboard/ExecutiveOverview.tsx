import type { DashboardData, SummaryRangeKey } from "@/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkline } from "./Sparkline";
import { ComboChart } from "./ComboChart";
import { StackedBarChart } from "./StackedBarChart";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { TrendingUp } from "lucide-react";
import { useFilters } from "./FilterContext";
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
  const { selectedChannels, selectedDevices, userType } = useFilters();
  
  // Filter the monthly series data based on selected filters
  // Uses proportional scaling to preserve monthly variation while reflecting filter selections
  const filterMonthlySeries = (series: typeof data.monthlySeries) => {
    // Calculate total metrics across all channels for ratio computation
    const allChannelSessions = data.channels.reduce((sum, channel) => sum + channel.sessions, 0);
    const allChannelPurchases = data.channels.reduce((sum, channel) => sum + channel.purchases, 0);
    const allChannelRevenue = data.channels.reduce((sum, channel) => sum + channel.revenue, 0);
    
    // Calculate total metrics for selected channels
    const filteredChannels = data.channels.filter(channel =>
      selectedChannels.includes(channel.channelId)
    );
    const selectedChannelSessions = filteredChannels.reduce((sum, channel) => sum + channel.sessions, 0);
    const selectedChannelPurchases = filteredChannels.reduce((sum, channel) => sum + channel.purchases, 0);
    const selectedChannelRevenue = filteredChannels.reduce((sum, channel) => sum + channel.revenue, 0);
    
    // Calculate channel filter ratios (what proportion of total is selected)
    const channelSessionsRatio = allChannelSessions > 0 ? selectedChannelSessions / allChannelSessions : 1;
    const channelPurchasesRatio = allChannelPurchases > 0 ? selectedChannelPurchases / allChannelPurchases : 1;
    const channelRevenueRatio = allChannelRevenue > 0 ? selectedChannelRevenue / allChannelRevenue : 1;
    
    // Calculate total metrics across all devices for ratio computation
    const allDeviceSessions = data.devices.reduce((sum, device) => sum + device.sessions, 0);
    const allDeviceRevenue = data.devices.reduce((sum, device) => sum + device.revenue, 0);
    
    // Calculate total metrics for selected devices
    const filteredDevices = data.devices.filter(device =>
      selectedDevices.includes(device.deviceId)
    );
    const selectedDeviceSessions = filteredDevices.reduce((sum, device) => sum + device.sessions, 0);
    const selectedDeviceRevenue = filteredDevices.reduce((sum, device) => sum + device.revenue, 0);
    
    // Calculate device filter ratios
    const deviceSessionsRatio = allDeviceSessions > 0 ? selectedDeviceSessions / allDeviceSessions : 1;
    const deviceRevenueRatio = allDeviceRevenue > 0 ? selectedDeviceRevenue / allDeviceRevenue : 1;
    
    // Combine ratios (use the more restrictive of the two filters)
    const combinedSessionsRatio = Math.min(channelSessionsRatio, deviceSessionsRatio);
    const combinedPurchasesRatio = channelPurchasesRatio; // Only channels have purchase data
    const combinedRevenueRatio = Math.min(channelRevenueRatio, deviceRevenueRatio);
    
    return series.map(month => {
      // Apply user type filter for newCustomers
      let newCustomers = month.newCustomers;
      if (userType === "returning") {
        newCustomers = 0;
      }
      
      // Scale the original monthly data proportionally based on filter ratios
      // This preserves the monthly variation while reflecting filter selections
      return {
        ...month,
        sessions: Math.round(month.sessions * combinedSessionsRatio),
        purchases: Math.round(month.purchases * combinedPurchasesRatio),
        revenue: Math.round(month.revenue * combinedRevenueRatio * 100) / 100,
        newCustomers: userType === "returning" ? 0 : Math.round(newCustomers * combinedSessionsRatio),
      };
    });
  };
  
  const stats = data.summaryByRange[range];
  const series = filterMonthlySeries(getSeriesForRange(data, range));
  const previousSeries = filterMonthlySeries(getPreviousSeries(data, range));
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
              className="border-3 border-foreground shadow-brutal p-4"
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
