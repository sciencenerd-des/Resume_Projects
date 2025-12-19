"use client";

import { formatCurrency } from "@/lib/format";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface ChannelData {
  label: string;
  syntheticSpend: number;
  revenue: number;
}

interface SpendRevenueChartProps {
  data: ChannelData[];
  height?: number;
}

const chartConfig = {
  syntheticSpend: {
    label: "Spend",
    color: "#FF6B6B", // Coral red
  },
  revenue: {
    label: "Revenue",
    color: "#4ECDC4", // Turquoise
  },
} satisfies ChartConfig;

export function SpendRevenueChart({ data, height = 300 }: SpendRevenueChartProps) {
  if (data.length === 0) return null;

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 20, left: 20, bottom: 50 }}
      >
        <CartesianGrid 
          strokeDasharray="0" 
          vertical={false}
          stroke="#1a1a1a"
          strokeWidth={1}
          strokeOpacity={0.15}
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: '#1a1a1a', strokeWidth: 2 }}
          tickMargin={10}
          fontSize={11}
          fontWeight={700}
          tick={{ fill: '#1a1a1a' }}
          label={{ value: 'Marketing Channels', position: 'bottom', offset: 15, fontSize: 12, fontWeight: 700, fill: '#1a1a1a' }}
        />
        <YAxis
          tickLine={false}
          axisLine={{ stroke: '#1a1a1a', strokeWidth: 2 }}
          tickFormatter={(value) => formatCurrency(value)}
          fontSize={10}
          fontWeight={600}
          width={75}
          tick={{ fill: '#1a1a1a' }}
          label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft', offset: -10, fontSize: 12, fontWeight: 700, fill: '#1a1a1a' }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="border-3 border-foreground shadow-brutal bg-background"
              formatter={(value, name) => {
                const label = name === "syntheticSpend" ? "Spend:" : "Revenue:";
                const color = name === "syntheticSpend" ? "#FF6B6B" : "#4ECDC4";
                return (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-muted-foreground">{label}</span>
                    <span className="font-black" style={{ color }}>{formatCurrency(value as number)}</span>
                  </div>
                );
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent className="font-bold" />} />
        <Bar
          dataKey="syntheticSpend"
          fill="#FF6B6B"
          stroke="#1a1a1a"
          strokeWidth={2}
          radius={0}
          maxBarSize={45}
        />
        <Bar
          dataKey="revenue"
          fill="#4ECDC4"
          stroke="#1a1a1a"
          strokeWidth={2}
          radius={0}
          maxBarSize={45}
        />
      </BarChart>
    </ChartContainer>
  );
}
