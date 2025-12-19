"use client";

import { formatNumber, formatPercent } from "@/lib/format";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface DataPoint {
  label: string;
  newSessions: number;
  returningSessions: number;
}

interface StackedBarChartProps {
  data: DataPoint[];
  height?: number;
  showLegend?: boolean;
}

const chartConfig = {
  newSessionsPct: {
    label: "New Users",
    color: "#FFE135", // Yellow
  },
  returningSessionsPct: {
    label: "Returning",
    color: "#FF6B6B", // Coral red
  },
} satisfies ChartConfig;

export function StackedBarChart({ data, height = 200, showLegend = true }: StackedBarChartProps) {
  if (data.length === 0) return null;

  // Convert absolute values to percentages for 100% stacked bar chart
  const percentageData = data.map(point => {
    const total = point.newSessions + point.returningSessions;
    return {
      label: point.label,
      newSessionsPct: total > 0 ? (point.newSessions / total) * 100 : 0,
      returningSessionsPct: total > 0 ? (point.returningSessions / total) * 100 : 0,
      // Keep original values for tooltips
      newSessions: point.newSessions,
      returningSessions: point.returningSessions,
      total,
    };
  });

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <BarChart
        data={percentageData}
        margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
      >
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
          fontSize={10}
          fontWeight={700}
          tick={{ fill: '#1a1a1a' }}
        />
        <YAxis
          tickLine={false}
          axisLine={{ stroke: '#1a1a1a', strokeWidth: 2 }}
          tickFormatter={(value) => `${value}%`}
          fontSize={10}
          fontWeight={600}
          width={50}
          tick={{ fill: '#1a1a1a' }}
          domain={[0, 100]}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="border-3 border-foreground shadow-brutal bg-background"
              formatter={(value, name, item) => {
                const payload = item.payload as typeof percentageData[0];
                const isNew = name === "newSessionsPct";
                const label = isNew ? "New Users:" : "Returning:";
                const color = isNew ? "#FFE135" : "#FF6B6B";
                const absoluteValue = isNew ? payload.newSessions : payload.returningSessions;
                const pctValue = value as number;
                return (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-muted-foreground">{label}</span>
                    <span className="font-black" style={{ color }}>
                      {pctValue.toFixed(1)}% ({formatNumber(absoluteValue)})
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        {showLegend && (
          <ChartLegend content={<ChartLegendContent className="font-bold" />} />
        )}
        <Bar
          dataKey="returningSessionsPct"
          stackId="stack"
          fill="#FF6B6B"
          stroke="#1a1a1a"
          strokeWidth={2}
          radius={0}
          maxBarSize={40}
        />
        <Bar
          dataKey="newSessionsPct"
          stackId="stack"
          fill="#FFE135"
          stroke="#1a1a1a"
          strokeWidth={2}
          radius={0}
          maxBarSize={40}
        />
      </BarChart>
    </ChartContainer>
  );
}
