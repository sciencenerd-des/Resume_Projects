"use client";

import { formatNumber } from "@/lib/format";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, YAxis, ResponsiveContainer } from "recharts";

interface SparklineProps {
  values: number[];
  labels?: string[]; // Month labels for each data point
  dataLabel?: string; // Label for the data (e.g., "Revenue", "Sessions")
  colorClass?: string;
  height?: number;
  showLabels?: boolean;
  xLabel?: string;
  yLabel?: string;
}

const DEFAULT_HEIGHT = 60;

// Map colorClass to neo-brutalist colors
const COLOR_MAP: Record<string, string> = {
  "text-blue-500": "#3B82F6",
  "text-green-500": "#4ECDC4",
  "text-indigo-500": "#A855F7",
  "text-chart-1": "#FF6B6B",
  "text-chart-2": "#4ECDC4",
  "text-chart-3": "#FFE135",
  "text-chart-4": "#A855F7",
  "text-chart-5": "#3B82F6",
};

const chartConfig = {
  value: {
    label: "Value",
    color: "#4ECDC4",
  },
} satisfies ChartConfig;

export function Sparkline({
  values,
  labels,
  dataLabel,
  colorClass = "text-chart-1",
  height = DEFAULT_HEIGHT,
}: SparklineProps) {
  if (!values.length) {
    return <div className="text-xs text-muted-foreground font-bold">No data</div>;
  }

  const first = values[0]!;
  const last = values[values.length - 1]!;
  const trend = last >= first ? 'up' : 'down';
  const trendColor = trend === 'up' ? '#4ECDC4' : '#FF6B6B';
  const chartColor = COLOR_MAP[colorClass] || "#4ECDC4";

  // Convert to Recharts format with optional labels
  const chartData = values.map((value, index) => ({
    index,
    value,
    label: labels?.[index] || `Point ${index + 1}`,
  }));

  // Calculate domain with padding to make sparkline variations more prominent
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = dataMax - dataMin || 1; // Avoid division by zero
  const padding = range * 0.15; // 15% padding
  const minDomain = Math.floor(dataMin - padding);
  const maxDomain = Math.ceil(dataMax + padding);

  return (
    <div className="w-full">
      {/* Labels row */}
      <div className="flex justify-between items-center mb-1 text-[11px] font-bold">
        <span className="text-muted-foreground">{formatNumber(first)}</span>
        <span style={{ color: trendColor }}>{formatNumber(last)}</span>
      </div>
      
      {/* Sparkline Chart */}
      <div className="border-2 border-foreground bg-muted/30" style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            {/* Hidden YAxis with auto-scaled domain based on data min/max with padding */}
            <YAxis 
              hide 
              domain={[minDomain, maxDomain]}
              dataKey="value"
            />
            <ChartTooltip
              cursor={false}
              position={{ y: -60 }}
              offset={10}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const dataPoint = payload[0]?.payload as { value: number; label: string };
                const value = dataPoint?.value;
                const monthLabel = dataPoint?.label;
                return (
                  <div className="border-2 border-foreground bg-background px-3 py-2 text-xs font-bold shadow-brutal-sm">
                    <div className="text-foreground mb-1">{monthLabel}</div>
                    <div className="flex items-center gap-2">
                      {dataLabel && <span className="text-muted-foreground">{dataLabel}:</span>}
                      <span style={{ color: chartColor }}>{formatNumber(value)}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={3}
              dot={false}
              activeDot={{ 
                r: 5, 
                strokeWidth: 2, 
                stroke: "#1a1a1a", 
                fill: "#FFE135" 
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
