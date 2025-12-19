export type SummaryRangeKey = "3m" | "6m" | "12m";

export interface RangeSummary {
  sessions: number;
  uniqueCustomers: number;
  addToCart: number;
  purchases: number;
  cartAbandons: number;
  revenue: number;
  addToCartRate: number;
  purchaseRate: number;
  cartToPurchaseRate: number;
  aov: number;
  revenuePerCustomer: number;
  newCustomers: number;
  syntheticSpend: number;
  cac: number;
  ltv: number;
  ltvToCac: number;
}

export interface MonthlySeriesPoint {
  month: string;
  label: string;
  sessions: number;
  addToCart: number;
  purchases: number;
  cartAbandons: number;
  revenue: number;
  newCustomers: number;
}

export interface ChannelPerformance {
  channelId: number;
  label: string;
  sessions: number;
  purchases: number;
  addToCart: number;
  cartAbandons: number;
  revenue: number;
  customers: number;
  newCustomers: number;
  syntheticSpend: number;
  cac: number;
  ltv: number;
  ltvToCac: number;
  purchaseRate: number;
  share: number;
}

export interface DevicePerformance {
  deviceId: number;
  label: string;
  sessions: number;
  addToCartRate: number;
  purchaseRate: number;
  cartToPurchaseRate: number;
  avgPages: number;
  revenue: number;
}

export interface RetentionMatrixRow {
  cohortMonth: string;
  monthOffset: number;
  retainedCustomers: number;
  retentionRate: number;
  cohortSize: number;
  revenue: number;
}

export interface RetentionCohortTrend {
  cohortMonth: string;
  cohortSize: number;
}

export interface RetentionData {
  matrix: RetentionMatrixRow[];
  cohortTrend: RetentionCohortTrend[];
}

export interface PhoneUsageOSRow {
  os: string;
  avgSpend: number;
  avgScreen: number;
  share: number;
}

export interface PhoneUsageLocationRow {
  location: string;
  avgSpend: number;
  users: number;
}

export interface PhoneUsagePrimaryUseRow {
  primaryUse: string;
  avgSpend: number;
  users: number;
}

export interface PhoneUsageScatterPoint {
  screenTime: number;
  spend: number;
  os: string;
  apps: number;
}

export interface PhoneUsageBucket {
  bucket: string;
  users: number;
}

export interface PhoneUsageData {
  byOS: PhoneUsageOSRow[];
  byLocation: PhoneUsageLocationRow[];
  byPrimaryUse: PhoneUsagePrimaryUseRow[];
  screenVsSpend: PhoneUsageScatterPoint[];
  dataUsageBuckets: PhoneUsageBucket[];
}

export interface DurationBucket {
  bucket: string;
  label: string;
  sessions: number;
  purchaseRate: number;
}

export interface FunnelSummary extends RangeSummary {
  durationBuckets?: DurationBucket[];
}

export interface DashboardData {
  summaryByRange: Record<SummaryRangeKey, RangeSummary>;
  monthlySeries: MonthlySeriesPoint[];
  funnel: FunnelSummary;
  channels: ChannelPerformance[];
  devices: DevicePerformance[];
  retention: RetentionData;
  phoneUsage: PhoneUsageData;
}
