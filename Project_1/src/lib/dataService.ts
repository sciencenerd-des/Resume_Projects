import type { DashboardData } from "@/data";
import { staticDashboardData } from "@/data";

const DASHBOARD_ENDPOINT = "/api/dashboard";
const STAR_TABLE_ENDPOINT = "/api/star-schema";

export type StarTableName =
  | "dim_customer"
  | "dim_date"
  | "dim_channel"
  | "dim_device"
  | "dim_location"
  | "dim_product"
  | "fact_sessions"
  | "fact_customer_day"
  | "fact_phone_usage";

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const response = await fetch(DASHBOARD_ENDPOINT);
    if (!response.ok) throw new Error(`Failed to load dashboard data: ${response.status}`);
    const json = (await response.json()) as DashboardData;
    return json;
  } catch (error) {
    console.warn("Falling back to static dashboard data", error);
    // Structured clone so downstream code cannot mutate the import directly
    return JSON.parse(JSON.stringify(staticDashboardData));
  }
}

export async function fetchStarTable<T = Record<string, string | number>>(table: StarTableName): Promise<T[]> {
  const response = await fetch(`${STAR_TABLE_ENDPOINT}/${table}`);
  if (!response.ok) throw new Error(`Failed to load table ${table}`);
  return (await response.json()) as T[];
}
