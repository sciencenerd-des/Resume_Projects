import type { DashboardData } from "@/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterDiagnostic } from "./ScatterDiagnostic";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { useFilters } from "./FilterContext";

interface FunnelSectionProps {
  data: DashboardData;
}

export function FunnelSection({ data }: FunnelSectionProps) {
  const { selectedChannels, selectedDevices, userType } = useFilters();
  
  // Filter data based on selected filters
  const filteredChannels = data.channels.filter(channel =>
    selectedChannels.includes(channel.channelId)
  );
  
  const filteredDevices = data.devices.filter(device =>
    selectedDevices.includes(device.deviceId)
  );
  
  // Calculate filtered funnel metrics
  const totalChannelSessions = filteredChannels.reduce((sum, channel) => sum + channel.sessions, 0);
  const totalChannelPurchases = filteredChannels.reduce((sum, channel) => sum + channel.purchases, 0);
  const totalChannelRevenue = filteredChannels.reduce((sum, channel) => sum + channel.revenue, 0);
  const totalChannelAddToCart = filteredChannels.reduce((sum, channel) => sum + channel.addToCart, 0);
  
  const totalDeviceSessions = filteredDevices.reduce((sum, device) => sum + device.sessions, 0);
  const avgDevicePurchaseRate = filteredDevices.reduce((sum, device) => sum + device.purchaseRate, 0) / Math.max(filteredDevices.length, 1);
  const estimatedDevicePurchases = totalDeviceSessions * avgDevicePurchaseRate;
  const totalDeviceRevenue = filteredDevices.reduce((sum, device) => sum + device.revenue, 0);
  
  // Apply user type filter
  let filteredNewCustomers = data.funnel.newCustomers;
  if (userType === "new") {
    filteredNewCustomers = data.funnel.newCustomers;
  } else if (userType === "returning") {
    filteredNewCustomers = 0;
  }
  
  // Calculate final filtered metrics
  const filteredSessions = Math.min(totalChannelSessions, totalDeviceSessions);
  const filteredPurchases = Math.min(totalChannelPurchases, estimatedDevicePurchases);
  const filteredRevenue = Math.min(totalChannelRevenue, totalDeviceRevenue);
  const filteredAddToCart = Math.min(totalChannelAddToCart, filteredSessions * 0.64); // Using avg add to cart rate
  
  const funnel = {
    sessions: filteredSessions,
    addToCart: filteredAddToCart,
    purchases: filteredPurchases,
    cartAbandons: filteredAddToCart - filteredPurchases,
    revenue: filteredRevenue,
    newCustomers: filteredNewCustomers,
    addToCartRate: filteredAddToCart / Math.max(filteredSessions, 1),
    purchaseRate: filteredPurchases / Math.max(filteredSessions, 1),
    cartToPurchaseRate: filteredPurchases / Math.max(filteredAddToCart, 1),
    aov: filteredRevenue / Math.max(filteredPurchases, 1),
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
                      className="border-3 border-foreground shadow-brutal p-4"
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
            <div className="grid gap-4 sm:grid-cols-3">
              {filteredDevices.map((device, index) => {
                const deviceColors = ['#4ECDC4', '#FFE135', '#FF6B6B'];
                return (
                  <div 
                    key={device.deviceId} 
                    className="border-3 border-foreground shadow-brutal p-4"
                    style={{ backgroundColor: deviceColors[index % deviceColors.length] }}
                  >
                    <p className="text-sm font-bold text-foreground uppercase tracking-wide">{device.label}</p>
                    <p className="text-3xl font-black text-foreground mt-1">{formatPercent(device.purchaseRate, 1)}</p>
                    <p className="text-xs font-bold text-foreground/80 mt-2">Cart → Purchase {formatPercent(device.cartToPurchaseRate, 1)}</p>
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

