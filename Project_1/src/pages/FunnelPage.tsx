import React from "react";
import type { DashboardData } from "@/data";
import { FunnelSection } from "@/components/dashboard/FunnelSection";
import { GlobalFilters } from "@/components/dashboard/GlobalFilters";

interface FunnelPageProps {
  data: DashboardData;
}

export function FunnelPage({ data }: FunnelPageProps) {
  return (
    <div className="space-y-8">
      <GlobalFilters />
      <FunnelSection data={data} />
    </div>
  );
}