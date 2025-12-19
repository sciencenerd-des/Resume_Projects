import rawDashboardData from "./dashboard-data.json";
import type { DashboardData, SummaryRangeKey } from "@/types/dashboard";

const dashboardData = rawDashboardData as DashboardData;

export const staticDashboardData: DashboardData = dashboardData;
export type { DashboardData, SummaryRangeKey };
