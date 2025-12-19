import type { DashboardData, SummaryRangeKey } from "@/data";

export const RANGE_LABELS: Record<SummaryRangeKey, string> = {
  "3m": "Last 90 days",
  "6m": "Last 180 days",
  "12m": "Full year",
};

export const RANGE_MONTHS: Record<SummaryRangeKey, number> = {
  "3m": 3,
  "6m": 6,
  "12m": 12,
};

export type MonthlyPoint = DashboardData["monthlySeries"][number];
export type KpiKey = "sessions" | "purchases" | "revenue" | "purchaseRate" | "aov";

export function getSeriesForRange(data: DashboardData, range: SummaryRangeKey): MonthlyPoint[] {
  const months = RANGE_MONTHS[range];
  return data.monthlySeries.slice(-months);
}

export function getPreviousSeries(data: DashboardData, range: SummaryRangeKey): MonthlyPoint[] {
  const months = RANGE_MONTHS[range];
  return data.monthlySeries.slice(-months * 2, -months);
}

export function computeKpiDeltas(current: MonthlyPoint[], previous: MonthlyPoint[]): Partial<Record<KpiKey, number>> {
  if (!previous.length) return {};
  const rollup = (series: MonthlyPoint[], key: keyof MonthlyPoint) => series.reduce((acc, point) => acc + (point[key] as number), 0);
  const deltas: Partial<Record<KpiKey, number>> = {};
  deltas.sessions = ratioDelta(rollup(current, "sessions"), rollup(previous, "sessions"));
  deltas.purchases = ratioDelta(rollup(current, "purchases"), rollup(previous, "purchases"));
  deltas.revenue = ratioDelta(rollup(current, "revenue"), rollup(previous, "revenue"));
  const currentPurchaseRate = rollup(current, "purchases") / Math.max(rollup(current, "sessions"), 1);
  const previousPurchaseRate = rollup(previous, "purchases") / Math.max(rollup(previous, "sessions"), 1);
  deltas.purchaseRate = ratioDelta(currentPurchaseRate, previousPurchaseRate);
  const currentAov = rollup(current, "revenue") / Math.max(rollup(current, "purchases"), 1);
  const previousAov = rollup(previous, "revenue") / Math.max(rollup(previous, "purchases"), 1);
  deltas.aov = ratioDelta(currentAov, previousAov);
  return deltas;
}

export function getChannelLeaders(data: DashboardData, limit = 4) {
  return [...data.channels].sort((a, b) => b.purchaseRate - a.purchaseRate).slice(0, limit);
}

function ratioDelta(current: number, previous: number) {
  if (!previous) return 0;
  return (current - previous) / previous;
}
