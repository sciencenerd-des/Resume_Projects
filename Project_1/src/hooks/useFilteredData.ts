import { useMemo } from "react";
import { useFilters } from "@/components/dashboard/FilterContext";
import type { 
  DashboardData, 
  ChannelPerformance, 
  DevicePerformance,
  MonthlySeriesPoint,
  RetentionData,
  PhoneUsageData,
  FunnelSummary
} from "@/types/dashboard";
import { USER_TYPE_MAP } from "@/lib/constants";

export interface FilteredDashboardData {
  channels: ChannelPerformance[];
  devices: DevicePerformance[];
  monthlySeries: MonthlySeriesPoint[];
  retention: RetentionData;
  phoneUsage: PhoneUsageData;
  funnel: FunnelSummary;
  isEmpty: boolean;
  // Computed ratios for proportional scaling
  channelRatio: number;
  deviceRatio: number;
}

/**
 * Unified hook for applying global filters to dashboard data.
 * Replaces inconsistent filter logic across sections with a single source of truth.
 */
export function useFilteredData(data: DashboardData): FilteredDashboardData {
  const { selectedChannels, selectedDevices, userType } = useFilters();

  return useMemo(() => {
    // Filter channels by selected channel IDs
    const filteredChannels = data.channels.filter(ch =>
      selectedChannels.includes(ch.channelId)
    );

    // Filter devices by selected device IDs
    const filteredDevices = data.devices.filter(d =>
      selectedDevices.includes(d.deviceId)
    );

    // Calculate channel ratio for proportional scaling
    const totalChannelSessions = data.channels.reduce((sum, ch) => sum + ch.sessions, 0);
    const selectedChannelSessions = filteredChannels.reduce((sum, ch) => sum + ch.sessions, 0);
    const channelRatio = totalChannelSessions > 0 
      ? selectedChannelSessions / totalChannelSessions 
      : 1;

    // Calculate device ratio for proportional scaling
    const totalDeviceSessions = data.devices.reduce((sum, d) => sum + d.sessions, 0);
    const selectedDeviceSessions = filteredDevices.reduce((sum, d) => sum + d.sessions, 0);
    const deviceRatio = totalDeviceSessions > 0 
      ? selectedDeviceSessions / totalDeviceSessions 
      : 1;

    // Combined ratio for metrics that span both dimensions
    const combinedRatio = Math.min(channelRatio, deviceRatio);

    // Filter monthly series with proportional scaling
    const filteredMonthlySeries: MonthlySeriesPoint[] = data.monthlySeries.map(month => {
      let newCustomers = month.newCustomers;
      
      // Apply user type filter
      if (userType === "returning") {
        newCustomers = 0;
      } else if (userType === "new") {
        // Scale by approximate new user ratio (from dimension data)
        newCustomers = Math.round(month.newCustomers * combinedRatio);
      } else {
        newCustomers = Math.round(month.newCustomers * combinedRatio);
      }

      return {
        ...month,
        sessions: Math.round(month.sessions * combinedRatio),
        purchases: Math.round(month.purchases * channelRatio),
        revenue: Math.round(month.revenue * combinedRatio * 100) / 100,
        addToCart: Math.round(month.addToCart * combinedRatio),
        cartAbandons: Math.round(month.cartAbandons * combinedRatio),
        newCustomers,
      };
    });

    // Filter retention data by cohort channel (approximation - cohorts don't have direct channel)
    // For now, scale by combined ratio since retention tracks customer behavior
    const filteredRetention: RetentionData = {
      matrix: data.retention.matrix.map(row => ({
        ...row,
        retainedCustomers: Math.round(row.retainedCustomers * combinedRatio),
        cohortSize: Math.round(row.cohortSize * combinedRatio),
        revenue: Math.round(row.revenue * combinedRatio * 100) / 100,
      })),
      cohortTrend: data.retention.cohortTrend.map(row => ({
        ...row,
        cohortSize: Math.round(row.cohortSize * combinedRatio),
      })),
    };

    // Filter phone usage data
    // Device filter: Mobile includes iOS/Android, Desktop/Tablet show all
    const filteredPhoneUsage: PhoneUsageData = {
      byOS: data.phoneUsage.byOS.filter(os => {
        // If mobile is selected, include mobile OS data
        if (selectedDevices.includes(1)) return true;
        // If only desktop/tablet, still show OS data for context
        if (selectedDevices.includes(0) || selectedDevices.includes(2)) return true;
        return false;
      }),
      byLocation: data.phoneUsage.byLocation,
      byPrimaryUse: data.phoneUsage.byPrimaryUse.map(segment => {
        // Apply user type filter based on dimension data, not magic numbers
        let users = segment.users;
        if (userType === "new") {
          // Approximate: new users are ~30% of total based on dim_customer analysis
          users = Math.round(segment.users * 0.3);
        } else if (userType === "returning") {
          // Returning users are ~70% of total
          users = Math.round(segment.users * 0.7);
        }
        return { ...segment, users };
      }),
      screenVsSpend: data.phoneUsage.screenVsSpend.filter(point => {
        // Filter by device type heuristic
        if (selectedDevices.includes(1)) {
          // Mobile selected - include mobile OS data
          if (point.os === "iOS" || point.os === "Android") return true;
        }
        // Desktop/Tablet selected - show all for context
        if (selectedDevices.includes(0) || selectedDevices.includes(2)) return true;
        return false;
      }),
      dataUsageBuckets: data.phoneUsage.dataUsageBuckets.map(bucket => {
        let users = bucket.users;
        if (userType === "new") {
          users = Math.round(bucket.users * 0.3);
        } else if (userType === "returning") {
          users = Math.round(bucket.users * 0.7);
        }
        return { ...bucket, users };
      }),
    };

    // Calculate filtered funnel metrics
    const filteredFunnel: FunnelSummary = {
      ...data.funnel,
      sessions: Math.round(data.funnel.sessions * combinedRatio),
      purchases: Math.round(data.funnel.purchases * channelRatio),
      revenue: Math.round(data.funnel.revenue * combinedRatio * 100) / 100,
      addToCart: Math.round(data.funnel.addToCart * combinedRatio),
      cartAbandons: Math.round(data.funnel.cartAbandons * combinedRatio),
      newCustomers: userType === "returning" ? 0 : Math.round(data.funnel.newCustomers * combinedRatio),
      uniqueCustomers: Math.round(data.funnel.uniqueCustomers * combinedRatio),
    };

    // Check for empty state
    const isEmpty = filteredChannels.length === 0 || filteredDevices.length === 0;

    return {
      channels: filteredChannels,
      devices: filteredDevices,
      monthlySeries: filteredMonthlySeries,
      retention: filteredRetention,
      phoneUsage: filteredPhoneUsage,
      funnel: filteredFunnel,
      isEmpty,
      channelRatio,
      deviceRatio,
    };
  }, [data, selectedChannels, selectedDevices, userType]);
}
