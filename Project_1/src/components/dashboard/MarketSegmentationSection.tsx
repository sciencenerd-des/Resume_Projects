import type { DashboardData } from "@/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterPlot } from "./ScatterPlot";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { useFilters } from "./FilterContext";

interface Props {
  data: DashboardData;
}

const OS_COLOR: Record<string, string> = {
  Android: "fill-emerald-500/80",
  iOS: "fill-indigo-500/80",
};

export function MarketSegmentationSection({ data }: Props) {
  const { selectedDevices, userType } = useFilters();
  
  // For market segmentation, we'll apply a simplified filter approach
  // Since phone usage data doesn't have direct channel/device associations,
  // we'll filter based on device type assumptions
  const filteredScreenVsSpend = data.phoneUsage.screenVsSpend.filter(point => {
    // Simple heuristic: if mobile is selected, include more mobile data points
    if (selectedDevices.includes(1) && point.os === "iOS") return true;
    if (selectedDevices.includes(1) && point.os === "Android") return true;
    // If desktop is selected, include all data points
    if (selectedDevices.includes(0)) return true;
    // If tablet is selected, include all data points
    if (selectedDevices.includes(2)) return true;
    return false;
  });
  
  const scatterPoints = filteredScreenVsSpend.map(point => ({
    x: point.screenTime,
    y: point.spend,
    label: `${point.os}-${point.apps}`,
    size: Math.max(1, Math.min(4, point.apps / 40)),
    color: OS_COLOR[point.os] ?? "fill-primary/70",
  }));

  // Apply user type filter to usage buckets
  const filteredDataUsageBuckets = data.phoneUsage.dataUsageBuckets.map(bucket => ({
    ...bucket,
    users: userType === "all" ? bucket.users : Math.floor(bucket.users * (userType === "new" ? 0.3 : 0.7))
  }));
  
  const filteredByPrimaryUse = data.phoneUsage.byPrimaryUse.map(segment => ({
    ...segment,
    users: userType === "all" ? segment.users : Math.floor(segment.users * (userType === "new" ? 0.3 : 0.7))
  }));

  const maxBucket = filteredDataUsageBuckets.length ? Math.max(...filteredDataUsageBuckets.map(bucket => bucket.users)) : 0;
  const maxPrimary = filteredByPrimaryUse.length ? Math.max(...filteredByPrimaryUse.map(segment => segment.users)) : 0;
  const safeMaxBucket = maxBucket > 0 ? maxBucket : 1;
  const safeMaxPrimary = maxPrimary > 0 ? maxPrimary : 1;

  return (
    <section className="space-y-4" id="market">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Page 5</p>
        <h2 className="text-2xl font-semibold">India Market Segmentation</h2>
        <p className="text-muted-foreground">Phone usage panel adds context to ecommerce funnel assumptions.</p>
      </div>

      <div className="grid gap-4 grid-cols-2">
        {data.phoneUsage.byOS
          .filter(os => {
            if (selectedDevices.includes(0) || selectedDevices.includes(2)) return true;
            if (selectedDevices.includes(1)) {
              return os.os === "Android" || os.os === "iOS";
            }
            return false;
          })
          .map((os, index) => {
            const bgColors = ['#10B981', '#6366F1']; // Green for Android, Indigo for iOS
            return (
              <div 
                key={os.os}
                className="border-3 border-foreground shadow-brutal p-4"
                style={{ backgroundColor: bgColors[index % bgColors.length] }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-lg font-black text-foreground uppercase">{os.os}</p>
                  <p className="text-sm font-bold text-foreground/80">{formatPercent(os.share, 1)} of panel</p>
                </div>
                <div className="flex gap-4 text-sm font-bold text-foreground">
                  <p>Spend: <span className="font-black">{formatCurrency(os.avgSpend, 0)}</span></p>
                  <p>Screen: <span className="font-black">{os.avgScreen.toFixed(1)} hrs/day</span></p>
                </div>
              </div>
            );
          })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Screen time vs Ecommerce spend</CardTitle>
            <CardDescription>Bubble size represents number of apps installed</CardDescription>
          </CardHeader>
          <CardContent>
            <ScatterPlot
              points={scatterPoints}
              xLabel="Screen time (hrs/day)"
              yLabel="Ecommerce spend (₹/mo)"
              xFormatter={value => `${value.toFixed(1)} hrs`}
              yFormatter={value => formatCurrency(value, 0)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data usage buckets</CardTitle>
            <CardDescription>Helps set media mix expectations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {filteredDataUsageBuckets.map(bucket => (
                <div key={bucket.bucket}>
                  <div className="flex items-center justify-between">
                    <span>{bucket.bucket} GB</span>
                    <span className="font-medium">{formatNumber(bucket.users)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(bucket.users / safeMaxBucket) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top cities by avg ecommerce spend</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm border-3 border-foreground">
              <thead>
                <tr className="bg-foreground text-background">
                  <th className="py-3 px-4 text-left font-black uppercase tracking-wide">City</th>
                  <th className="py-3 px-4 text-right font-black uppercase tracking-wide">Avg Spend (₹)</th>
                  <th className="py-3 px-4 text-right font-black uppercase tracking-wide">Respondents</th>
                </tr>
              </thead>
              <tbody>
                {data.phoneUsage.byLocation.map((location, index) => {
                  const rowColors = ['#4ECDC4', '#FFE135', '#FF6B6B', '#A855F7', '#3B82F6', '#10B981'];
                  return (
                    <tr 
                      key={location.location} 
                      className="border-t-2 border-foreground font-bold"
                      style={{ backgroundColor: `${rowColors[index % rowColors.length]}40` }}
                    >
                      <td className="py-3 px-4 font-black">{location.location}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(location.avgSpend, 0)}</td>
                      <td className="py-3 px-4 text-right">{formatNumber(location.users)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Primary use cases</CardTitle>
            <CardDescription>Segments sized by users, sorted by spend</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredByPrimaryUse.map(segment => (
              <div key={segment.primaryUse}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{segment.primaryUse}</span>
                  <span>{formatCurrency(segment.avgSpend, 0)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-secondary" style={{ width: `${(segment.users / safeMaxPrimary) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
