import React from "react";
import type { DashboardData } from "@/data";
import { MarketSegmentationSection } from "@/components/dashboard/MarketSegmentationSection";
import { GlobalFilters } from "@/components/dashboard/GlobalFilters";

interface MarketPageProps {
  data: DashboardData;
}

export function MarketPage({ data }: MarketPageProps) {
  return (
    <div className="space-y-8">
      <GlobalFilters />
      <MarketSegmentationSection data={data} />
    </div>
  );
}