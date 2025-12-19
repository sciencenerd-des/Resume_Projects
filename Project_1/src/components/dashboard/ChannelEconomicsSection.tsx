import { useMemo, useState } from "react";
import type { DashboardData } from "@/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScatterPlot } from "./ScatterPlot";
import { WhatIfPanel } from "./WhatIfPanel";
import { SpendRevenueChart } from "./SpendRevenueChart";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { useFilters } from "./FilterContext";

interface Props {
  data: DashboardData;
}

export function ChannelEconomicsSection({ data }: Props) {
  const { selectedChannels, selectedDevices, userType } = useFilters();
  const [channelId, setChannelId] = useState(() => data.channels[0]?.channelId ?? 0);
  
  // Filter channels based on selected filters
  const filteredChannels = data.channels.filter(channel =>
    selectedChannels.includes(channel.channelId)
  );
  
  const selected = useMemo(() => filteredChannels.find(channel => channel.channelId === channelId) ?? filteredChannels[0], [channelId, filteredChannels]);

  const scatterPoints = filteredChannels.map(channel => ({
    x: channel.cac,
    y: channel.ltv,
    label: channel.label,
    size: Math.max(1, Math.min(5, channel.newCustomers / 150)),
    color: channel.ltvToCac >= 1 ? "fill-emerald-500/80" : "fill-rose-500/80",
  }));

  return (
    <section className="space-y-4" id="channel">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Page 4</p>
          <h2 className="text-2xl font-semibold">Channel Unit Economics</h2>
          <p className="text-muted-foreground">CAC lever is driven by assumed channel costs — tweak in `processed/assumed_channel_costs.csv`.</p>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Focus channel</span>
          <Select value={channelId.toString()} onValueChange={value => setChannelId(Number(value))}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              {data.channels.map(channel => (
                <SelectItem key={channel.channelId} value={String(channel.channelId)}>
                  {channel.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Channel table</CardTitle>
            <CardDescription>
              Sorted by channel · Synthetic spend {formatCurrency(filteredChannels.reduce((sum, channel) => sum + channel.syntheticSpend, 0), 0)}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm border-3 border-foreground">
              <thead>
                <tr className="bg-foreground text-background">
                  <th className="py-3 px-4 text-left font-black uppercase tracking-wide">Channel</th>
                  <th className="py-3 px-4 text-right font-black uppercase tracking-wide">Sessions</th>
                  <th className="py-3 px-4 text-right font-black uppercase tracking-wide">New Cust.</th>
                  <th className="py-3 px-4 text-right font-black uppercase tracking-wide">Revenue</th>
                  <th className="py-3 px-4 text-right font-black uppercase tracking-wide">CAC</th>
                  <th className="py-3 px-4 text-right font-black uppercase tracking-wide">LTV</th>
                  <th className="py-3 px-4 text-right font-black uppercase tracking-wide">LTV:CAC</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredChannels].sort((a, b) => a.channelId - b.channelId).map((channel, index) => {
                  const rowColors = ['#4ECDC4', '#FFE135', '#FF6B6B', '#A855F7', '#3B82F6', '#10B981'];
                  return (
                    <tr 
                      key={channel.channelId} 
                      className="border-t-2 border-foreground font-bold"
                      style={{ backgroundColor: `${rowColors[index % rowColors.length]}40` }}
                    >
                      <td className="py-3 px-4 font-black">{channel.label}</td>
                      <td className="py-3 px-4 text-right">{formatNumber(channel.sessions)}</td>
                      <td className="py-3 px-4 text-right">{formatNumber(channel.newCustomers)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(channel.revenue / 1_00_000, 1)} L</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(channel.cac, 0)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(channel.ltv, 0)}</td>
                      <td className={`py-3 px-4 text-right font-black ${channel.ltvToCac >= 3 ? "text-emerald-600" : "text-amber-600"}`}>
                        {channel.ltvToCac.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CAC vs LTV</CardTitle>
            <CardDescription>Bubble size = new customers</CardDescription>
          </CardHeader>
          <CardContent>
            <ScatterPlot
              points={scatterPoints}
              xLabel="CAC (₹)"
              yLabel="Observed LTV (₹)"
              xFormatter={value => formatCurrency(value, 0)}
              yFormatter={value => formatCurrency(value, 0)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend vs Revenue</CardTitle>
            <CardDescription>Comparison of acquisition cost and attributed value</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendRevenueChart data={filteredChannels} />
          </CardContent>
        </Card>
        {selected ? (
          <Card>
            <CardHeader>
              <CardTitle>{selected.label} drill-down</CardTitle>
              <CardDescription>{formatPercent(selected.purchaseRate, 1)} purchase rate · {formatPercent(selected.share, 1)} of sessions</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="border-3 border-foreground shadow-brutal p-4" style={{ backgroundColor: '#4ECDC4' }}>
                <p className="text-sm font-bold text-foreground uppercase tracking-wide">Revenue</p>
                <p className="text-2xl font-black text-foreground mt-1">{formatCurrency(selected.revenue / 1_00_000, 1)} L</p>
              </div>
              <div className="border-3 border-foreground shadow-brutal p-4" style={{ backgroundColor: '#FFE135' }}>
                <p className="text-sm font-bold text-foreground uppercase tracking-wide">CAC</p>
                <p className="text-2xl font-black text-foreground mt-1">{formatCurrency(selected.cac, 0)}</p>
              </div>
              <div className="border-3 border-foreground shadow-brutal p-4" style={{ backgroundColor: '#FF6B6B' }}>
                <p className="text-sm font-bold text-foreground uppercase tracking-wide">LTV</p>
                <p className="text-2xl font-black text-foreground mt-1">{formatCurrency(selected.ltv, 0)}</p>
              </div>
              <div className="border-3 border-foreground shadow-brutal p-4" style={{ backgroundColor: '#A855F7' }}>
                <p className="text-sm font-bold text-foreground uppercase tracking-wide">Synthetic spend</p>
                <p className="text-2xl font-black text-foreground mt-1">{formatCurrency(selected.syntheticSpend, 0)}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* What-If Panel for CAC scenario planning */}
      <WhatIfPanel channels={filteredChannels} />
    </section>
  );
}

