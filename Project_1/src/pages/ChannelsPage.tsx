import React from "react";
import type { DashboardData } from "@/data";
import { ChannelEconomicsSection } from "@/components/dashboard/ChannelEconomicsSection";
import { GlobalFilters } from "@/components/dashboard/GlobalFilters";

interface ChannelsPageProps {
  data: DashboardData;
}

export function ChannelsPage({ data }: ChannelsPageProps) {
  return (
    <div className="space-y-8">
      <GlobalFilters />
      <ChannelEconomicsSection data={data} />
    </div>
  );
}