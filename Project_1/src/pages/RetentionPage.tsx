import React from "react";
import type { DashboardData } from "@/data";
import { RetentionSection } from "@/components/dashboard/RetentionSection";
import { GlobalFilters } from "@/components/dashboard/GlobalFilters";

interface RetentionPageProps {
  data: DashboardData;
}

export function RetentionPage({ data }: RetentionPageProps) {
  return (
    <div className="space-y-8">
      <GlobalFilters />
      <RetentionSection data={data} />
    </div>
  );
}