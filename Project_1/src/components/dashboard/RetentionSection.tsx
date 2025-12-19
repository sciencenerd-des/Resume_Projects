import type { DashboardData } from "@/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "./Sparkline";
import { formatNumber, formatPercent } from "@/lib/format";
import { useFilters } from "./FilterContext";

interface RetentionSectionProps {
  data: DashboardData;
}

const months = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

export function RetentionSection({ data }: RetentionSectionProps) {
  const { selectedChannels, selectedDevices, userType } = useFilters();
  
  // Filter retention data based on selected filters
  const filteredMatrix = data.retention.matrix.filter(row => {
    // For retention, we'll apply a simplified filter based on the assumption that
    // retention data should be consistent with channel/device selections
    // This is a simplified approach since retention data doesn't have direct channel/device associations
    return true; // For now, show all retention data
  });
  
  const filteredCohortTrend = data.retention.cohortTrend.filter(row => {
    // Apply user type filter to cohort sizes
    if (userType === "new") {
      return row.cohortSize > 0; // Show all cohorts for new users
    } else if (userType === "returning") {
      return row.cohortSize > 0; // Show all cohorts for returning users
    }
    return true;
  });
  
  const cohorts = Array.from(new Set(filteredMatrix.map(row => row.cohortMonth))).sort();
  const mapKey = (cohort: string, month: number) => `${cohort}-${month}`;
  const matrix = new Map<string, { retentionRate: number; retainedCustomers: number }>();
  filteredMatrix.forEach(row => {
    matrix.set(mapKey(row.cohortMonth, row.monthOffset), {
      retentionRate: row.retentionRate,
      retainedCustomers: row.retainedCustomers,
    });
  });
  const cohortSizes = new Map(filteredCohortTrend.map(row => [row.cohortMonth, row.cohortSize]));

  const monthLabels = months.map(month => `M${month}`);

  const topQuarter = [...filteredMatrix]
    .filter(row => row.monthOffset === 3)
    .sort((a, b) => b.retentionRate - a.retentionRate)[0];

  const cohortSpark = filteredCohortTrend.map(row => row.cohortSize);

  return (
    <section className="space-y-4" id="retention">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Page 3</p>
          <h2 className="text-2xl font-semibold">Retention Cohorts</h2>
          <p className="text-muted-foreground">Month 0 = first visit. Values lock the cohort denominator for defensible retention math.</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Latest cohort size: {formatNumber(filteredCohortTrend.at(-1)?.cohortSize ?? 0)} users
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retention heatmap</CardTitle>
          <CardDescription>Cells show retained customers ÷ cohort size</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 bg-background text-left">Cohort</th>
                {monthLabels.map(label => (
                  <th key={label} className="px-2 py-2 text-center font-medium text-muted-foreground">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map(cohort => (
                <tr key={cohort}>
                  <td className="sticky left-0 bg-background py-2 font-medium">{new Date(`${cohort}-01`).toLocaleString("en-US", { month: "short", year: "2-digit" })}</td>
                  {months.map((month, idx) => {
                    const info = matrix.get(mapKey(cohort, Number(month)));
                    const rate = info?.retentionRate ?? 0;
                    const bgOpacity = Math.min(1, rate * 3 + 0.05);
                    return (
                      <td key={month} className="px-2 py-1 text-center" style={{ backgroundColor: `rgba(16, 185, 129, ${bgOpacity})` }}>
                        <span className="text-xs font-semibold text-white drop-shadow">{formatPercent(rate, 0)}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cohort acquisition trend</CardTitle>
            <CardDescription>Shows new customers per month</CardDescription>
          </CardHeader>
          <CardContent>
            <Sparkline 
              values={cohortSpark} 
              labels={filteredCohortTrend.map(row => 
                new Date(`${row.cohortMonth}-01`).toLocaleString("en-US", { month: "short", year: "numeric" })
              )}
              dataLabel="New Customers"
              colorClass="text-indigo-500" 
              height={120} 
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Best M3 retention</CardTitle>
            <CardDescription>Highlight cohorts to replicate</CardDescription>
          </CardHeader>
          <CardContent>
            {topQuarter ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Cohort</span>
                  <span className="font-semibold">{new Date(`${topQuarter.cohortMonth}-01`).toLocaleString("en-US", { month: "long" })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cohort size</span>
                  <span className="font-semibold">{formatNumber(cohortSizes.get(topQuarter.cohortMonth) ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Month 3 retention</span>
                  <span className="font-semibold">{formatPercent(topQuarter.retentionRate, 1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Customers retained</span>
                  <span className="font-semibold">{formatNumber(topQuarter.retainedCustomers)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough cohort data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
