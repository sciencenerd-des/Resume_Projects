import React from "react";
import type { DashboardData, SummaryRangeKey } from "@/data";
import { ExecutiveOverview } from "@/components/dashboard/ExecutiveOverview";
import { GlobalFilters } from "@/components/dashboard/GlobalFilters";

interface OverviewPageProps {
  data: DashboardData;
  range: SummaryRangeKey;
  onRangeChange: (range: SummaryRangeKey) => void;
}

export function OverviewPage({ data, range, onRangeChange }: OverviewPageProps) {
  return (
    <div className="space-y-8">
      <GlobalFilters />
      <ExecutiveOverview data={data} range={range} onRangeChange={onRangeChange} />
    </div>
  );
}