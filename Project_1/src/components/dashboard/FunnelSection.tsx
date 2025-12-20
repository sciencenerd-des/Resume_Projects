import type { DashboardData } from "@/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterDiagnostic } from "./ScatterDiagnostic";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { useFilteredData } from "@/hooks/useFilteredData";
import { EmptyState } from "@/components/ui/empty-state";
import { useFilters } from "@/components/dashboard/FilterContext";

interface FunnelSectionProps {
  data: DashboardData;
}

export function FunnelSection({ data }: FunnelSectionProps) {
  // Use centralized filter hook instead of inline filtering logic
  const { 
    channels: filteredChannels, 
    devices: filteredDevices, 
    funnel: filteredFunnel,
    isEmpty 
  } = useFilteredData(data);
  const { resetFilters } = useFilters();
  
  // Show empty state if filters return no data
  if (isEmpty) {
    return (
      <section className="space-y-4" id="funnel">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Page 2</p>
            <h2 className="text-2xl font-semibold">Funnel & Drop-off</h2>
          </div>
        </div>
        <EmptyState onReset={resetFilters} />
      </section>
    );
  }
  
  // Use the pre-calculated filtered funnel metrics from the hook
  const funnel = {
    sessions: filteredFunnel.sessions,
    addToCart: filteredFunnel.addToCart,
    purchases: filteredFunnel.purchases,
    cartAbandons: filteredFunnel.cartAbandons,
    revenue: filteredFunnel.revenue,
    newCustomers: filteredFunnel.newCustomers,
    addToCartRate: filteredFunnel.addToCartRate,
    purchaseRate: filteredFunnel.purchaseRate,
    cartToPurchaseRate: filteredFunnel.cartToPurchaseRate,
    aov: filteredFunnel.aov,
  };
  
  const stages = [
    { label: "Sessions", value: funnel.sessions },
    { label: "Add to Cart", value: funnel.addToCart },
    { label: "Purchases", value: funnel.purchases },
  ];

  const channelLeaders = [...filteredChannels].sort((a, b) => b.purchaseRate - a.purchaseRate).slice(0, 4);

  return (
    <section className="space-y-4" id="funnel">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Page 2</p>
          <h2 className="text-2xl font-semibold">Funnel & Drop-off</h2>
          <p className="text-muted-foreground">Visualize friction from top to bottom and isolate device/channel splits.</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Acquisition funnel</CardTitle>
            <CardDescription>Cart abandonment {formatPercent(funnel.cartAbandons / funnel.addToCart, 1)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-stretch gap-4 py-6">
              {stages.map((stage, index) => {
                const nextStageValue = stages[index + 1]?.value;
                // Neo-brutalist colors for each funnel stage
                const bgColors = ['#4ECDC4', '#FFE135', '#FF6B6B']; // Turquoise, Yellow, Coral
                return (
                  <div key={stage.label} className="flex-1 flex flex-col">
                    <div 
                      className="border-3 border-foreground shadow-brutal p-4 hover-brutal cursor-pointer transition-all"
                      style={{ 
                        backgroundColor: bgColors[index],
                        minHeight: '100px'
                      }}
                    >
                      <p className="text-sm font-bold text-foreground uppercase tracking-wide">{stage.label}</p>
                      <p className="text-2xl font-black text-foreground mt-1">{formatNumber(stage.value)}</p>
                    </div>
                    {/* Always render the pass-through row for alignment */}
                    <p className="mt-2 text-xs text-muted-foreground text-center h-4">
                      {index < stages.length - 1 && nextStageValue 
                        ? `${formatPercent(nextStageValue / Math.max(stage.value, 1), 1)} pass-through`
                        : '\u00A0' // Non-breaking space for height consistency
                      }
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top performing channels</CardTitle>
            <CardDescription>Full-year behavior</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm border-3 border-foreground">
              <thead>
                <tr className="bg-foreground text-background">
                  <th className="py-3 px-4 text-left font-black uppercase tracking-wide">Channel</th>
                  <th className="py-3 px-4 text-right font-black uppercase tracking-wide">Sessions</th>
                  <th className="py-3 px-4 text-right font-black uppercase tracking-wide">Purchase rate</th>
                  <th className="py-3 px-4 text-right font-black uppercase tracking-wide">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {channelLeaders.map((channel, index) => {
                  const rowColors = ['#4ECDC4', '#FFE135', '#FF6B6B', '#A855F7'];
                  return (
                    <tr 
                      key={channel.channelId} 
                      className="border-t-2 border-foreground font-bold"
                      style={{ backgroundColor: `${rowColors[index % rowColors.length]}40` }}
                    >
                      <td className="py-3 px-4 font-black">{channel.label}</td>
                      <td className="py-3 px-4 text-right">{formatNumber(channel.sessions)}</td>
                      <td className="py-3 px-4 text-right">{formatPercent(channel.purchaseRate, 1)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(channel.revenue / 1_00_000, 1)} L</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Device-level diagnostics</CardTitle>
            <CardDescription>Conversion efficiency by form factor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              {filteredDevices.map((device, index) => {
                const deviceColors = ['#4ECDC4', '#FFE135', '#FF6B6B'];
                return (
                  <div 
                    key={device.deviceId} 
                    className="border-3 border-foreground shadow-brutal p-5 min-h-[140px] flex flex-col justify-between hover-brutal transition-all"
                    style={{ backgroundColor: deviceColors[index % deviceColors.length] }}
                  >
                    <div>
                      <p className="text-sm font-bold text-foreground uppercase tracking-wide">{device.label}</p>
                      <p className="text-4xl font-black text-foreground mt-2">{formatPercent(device.purchaseRate, 1)}</p>
                      <p className="text-xs font-medium text-foreground/70 mt-1">Purchase Rate</p>
                    </div>
                    <div className="mt-4 pt-3 border-t-2 border-foreground/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground/80 uppercase">Cart → Purchase</span>
                        <span className="text-sm font-black text-foreground">{formatPercent(device.cartToPurchaseRate, 1)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Session Length & Intent</CardTitle>
            <CardDescription>Purchase rate by session length</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.funnel.durationBuckets?.map(bucket => (
                <div key={bucket.bucket} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{bucket.label}</span>
                    <span className="text-muted-foreground">{formatPercent(bucket.purchaseRate, 1)} purchase rate</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div 
                      className="h-full rounded-full bg-chart-4" 
                      style={{ width: `${bucket.purchaseRate * 100 * 2}%` }} // Scale for visibility
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scatter diagnostic - Pages Viewed vs Purchase Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement vs Conversion</CardTitle>
          <CardDescription>Pages viewed vs purchase rate by device (bubble size = sessions)</CardDescription>
        </CardHeader>
        <CardContent>
          <ScatterDiagnostic
            data={data.devices.map(device => ({
              pagesViewed: device.avgPages,
              purchaseRate: device.purchaseRate,
              sessions: device.sessions,
              label: device.label,
            }))}
          />
        </CardContent>
      </Card>
    </section>
  );
}

