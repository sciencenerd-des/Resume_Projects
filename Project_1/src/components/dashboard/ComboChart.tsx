"use client";

import { formatCurrency, formatNumber } from "@/lib/format";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Label,
} from "recharts";

interface DataPoint {
  label: string;
  revenue: number;
  purchases: number;
}

interface ComboChartProps {
  data: DataPoint[];
  height?: number;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "#4ECDC4", // Turquoise
  },
  purchases: {
    label: "Purchases",
    color: "#A855F7", // Purple
  },
} satisfies ChartConfig;

export function ComboChart({ data, height = 280 }: ComboChartProps) {
  if (data.length === 0) return null;

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <ComposedChart
        data={data}
        margin={{ top: 20, right: 40, left: 20, bottom: 20 }}
      >
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ECDC4" stopOpacity={1} />
            <stop offset="100%" stopColor="#4ECDC4" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid 
          strokeDasharray="0" 
          vertical={false} 
          stroke="#1a1a1a"
          strokeWidth={1}
          strokeOpacity={0.2}
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: '#1a1a1a', strokeWidth: 2 }}
          tickMargin={10}
          tickFormatter={(value) => value.split(' ')[0]}
          fontSize={11}
          fontWeight={700}
          tick={{ fill: '#1a1a1a' }}
        />
        <YAxis
          yAxisId="revenue"
          orientation="left"
          tickLine={false}
          axisLine={{ stroke: '#4ECDC4', strokeWidth: 3 }}
          tickFormatter={(value) => formatCurrency(value)}
          fontSize={10}
          fontWeight={600}
          width={75}
          tick={{ fill: '#4ECDC4' }}
        >
          <Label
            value="Revenue (₹)"
            angle={-90}
            position="insideLeft"
            style={{ textAnchor: 'middle', fill: '#4ECDC4', fontWeight: 700, fontSize: 12 }}
            offset={-5}
          />
        </YAxis>
        <YAxis
          yAxisId="purchases"
          orientation="right"
          tickLine={false}
          axisLine={{ stroke: '#A855F7', strokeWidth: 3 }}
          tickFormatter={(value) => formatNumber(value)}
          fontSize={10}
          fontWeight={600}
          width={55}
          tick={{ fill: '#A855F7' }}
        >
          <Label
            value="Purchases"
            angle={90}
            position="insideRight"
            style={{ textAnchor: 'middle', fill: '#A855F7', fontWeight: 700, fontSize: 12 }}
            offset={-5}
          />
        </YAxis>
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="border-3 border-foreground shadow-brutal bg-background"
              formatter={(value, name) => {
                if (name === "revenue") {
                  return (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-muted-foreground">Revenue:</span>
                      <span className="font-black text-[#4ECDC4]">{formatCurrency(value as number)}</span>
                    </div>
                  );
                }
                return (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-muted-foreground">Purchases:</span>
                    <span className="font-black text-[#A855F7]">{formatNumber(value as number)}</span>
                  </div>
                );
              }}
            />
          }
        />
        <Bar
          yAxisId="revenue"
          dataKey="revenue"
          fill="url(#revenueGradient)"
          stroke="#1a1a1a"
          strokeWidth={2}
          radius={0}
          maxBarSize={45}
        />
        <Line
          yAxisId="purchases"
          type="monotone"
          dataKey="purchases"
          stroke="#A855F7"
          strokeWidth={4}
          dot={{ fill: "#A855F7", strokeWidth: 3, r: 6, stroke: "#1a1a1a" }}
          activeDot={{ r: 8, strokeWidth: 3, stroke: "#1a1a1a", fill: "#FFE135" }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
