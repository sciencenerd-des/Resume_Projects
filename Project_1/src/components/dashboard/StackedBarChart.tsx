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
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine } from "recharts";

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
  trendLine: {
    label: "New User Ratio",
    color: "#3B82F6", // Blue
  },
} satisfies ChartConfig;

export function StackedBarChart({ data, height = 280, showLegend = true }: StackedBarChartProps) {
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
      // Calculate ratio for trend line (scaled to fit Y axis 0-100)
      newRatio: total > 0 ? (point.newSessions / total) * 100 : 0,
    };
  });

  // Calculate average ratio for reference line
  const avgRatio = percentageData.reduce((sum, p) => sum + p.newRatio, 0) / percentageData.length;

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <ComposedChart
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
        {/* Average ratio reference line */}
        <ReferenceLine 
          y={avgRatio} 
          stroke="#3B82F6" 
          strokeDasharray="8 4" 
          strokeWidth={2}
          strokeOpacity={0.6}
          label={{ 
            value: `Avg: ${avgRatio.toFixed(0)}%`, 
            position: 'right', 
            fill: '#3B82F6', 
            fontSize: 10, 
            fontWeight: 700 
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="border-3 border-foreground shadow-brutal bg-background"
              formatter={(value, name, item) => {
                const payload = item.payload as typeof percentageData[0];
                if (name === "newRatio") {
                  return (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-muted-foreground">New User Trend:</span>
                      <span className="font-black" style={{ color: '#3B82F6' }}>
                        {(value as number).toFixed(1)}%
                      </span>
                    </div>
                  );
                }
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
        {/* Trend line showing new user ratio over time */}
        <Line
          type="monotone"
          dataKey="newRatio"
          stroke="#3B82F6"
          strokeWidth={3}
          dot={{ r: 4, fill: '#3B82F6', stroke: '#1a1a1a', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: '#3B82F6', stroke: '#1a1a1a', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
