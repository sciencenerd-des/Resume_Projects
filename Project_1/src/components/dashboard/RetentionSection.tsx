import { useState } from "react";
import type { DashboardData } from "@/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "./Sparkline";
import { formatNumber, formatPercent } from "@/lib/format";
import { useFilteredData } from "@/hooks/useFilteredData";
import { EmptyState } from "@/components/ui/empty-state";
import { useFilters } from "@/components/dashboard/FilterContext";

interface RetentionSectionProps {
  data: DashboardData;
}

const months = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
const monthOptions = months.slice(1).map(m => ({ value: Number(m), label: `M${m}` }));

export function RetentionSection({ data }: RetentionSectionProps) {
  // Use centralized filter hook - CRITICAL FIX: replaces the no-op "return true" filter
  const { retention, isEmpty } = useFilteredData(data);
  const { resetFilters } = useFilters();
  const [selectedMonth, setSelectedMonth] = useState(3);
  
  // Show empty state if filters return no data
  if (isEmpty) {
    return (
      <section className="space-y-4" id="retention">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Page 3</p>
            <h2 className="text-2xl font-semibold">Retention Cohorts</h2>
          </div>
        </div>
        <EmptyState onReset={resetFilters} />
      </section>
    );
  }
  
  // Use properly filtered retention data from the hook
  const filteredMatrix = retention.matrix;
  const filteredCohortTrend = retention.cohortTrend;
  
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

  // Get top cohort for the selected month
  const topCohort = [...filteredMatrix]
    .filter(row => row.monthOffset === selectedMonth)
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
                    // Red-Yellow-Green color scale for better pattern recognition
                    // Low retention (0-15%) = red, medium (15-30%) = yellow, high (30%+) = green
                    let bgColor: string;
                    if (rate < 0.15) {
                      // Red to orange for low retention
                      const intensity = rate / 0.15;
                      bgColor = `rgb(${239 - Math.round(intensity * 50)}, ${68 + Math.round(intensity * 100)}, ${68 + Math.round(intensity * 30)})`;
                    } else if (rate < 0.30) {
                      // Orange to yellow for medium retention
                      const intensity = (rate - 0.15) / 0.15;
                      bgColor = `rgb(${189 - Math.round(intensity * 50)}, ${168 + Math.round(intensity * 50)}, ${53 + Math.round(intensity * 30)})`;
                    } else {
                      // Yellow to green for high retention
                      const intensity = Math.min(1, (rate - 0.30) / 0.20);
                      bgColor = `rgb(${139 - Math.round(intensity * 123)}, ${218 - Math.round(intensity * 33)}, ${83 - Math.round(intensity * 32)})`;
                    }
                    return (
                      <td 
                        key={month} 
                        className="px-2 py-1 text-center border-2 border-foreground/10 hover:border-foreground transition-colors cursor-pointer" 
                        style={{ backgroundColor: bgColor }}
                        title={`${(rate * 100).toFixed(1)}% retention | ${info?.retainedCustomers ?? 0} customers retained`}
                      >
                        <span className="text-xs font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">{formatPercent(rate, 0)}</span>
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
              height={200} 
            />
          </CardContent>
        </Card>
        <Card className="border-brutal-2 shadow-brutal bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b-2 border-border">
            <div>
              <CardTitle className="text-brutal text-base">Best {`M${selectedMonth}`} Retention</CardTitle>
              <CardDescription>Highlight cohorts to replicate</CardDescription>
            </div>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="appearance-none border-brutal-2 bg-secondary text-secondary-foreground shadow-brutal-sm px-4 py-2 pr-10 font-bold text-sm cursor-pointer hover-brutal transition-all"
              >
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {topCohort ? (
              <table className="w-full text-sm border-brutal-2">
                <tbody>
                  <tr className="border-b-2 border-border hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4 font-bold uppercase tracking-wide text-muted-foreground">Cohort</td>
                    <td className="py-3 px-4 text-right font-black text-lg">{new Date(`${topCohort.cohortMonth}-01`).toLocaleString("en-US", { month: "long" })}</td>
                  </tr>
                  <tr className="border-b-2 border-border hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4 font-bold uppercase tracking-wide text-muted-foreground">Cohort size</td>
                    <td className="py-3 px-4 text-right font-black text-lg">{formatNumber(cohortSizes.get(topCohort.cohortMonth) ?? 0)}</td>
                  </tr>
                  <tr className="border-b-2 border-border hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4 font-bold uppercase tracking-wide text-muted-foreground">Month {selectedMonth} retention</td>
                    <td className="py-3 px-4 text-right font-black text-lg text-accent">{formatPercent(topCohort.retentionRate, 1)}</td>
                  </tr>
                  <tr className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4 font-bold uppercase tracking-wide text-muted-foreground">Customers retained</td>
                    <td className="py-3 px-4 text-right font-black text-lg">{formatNumber(topCohort.retainedCustomers)}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground font-bold uppercase">Not enough cohort data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

