"use client";

import { formatPercent, formatNumber } from "@/lib/format";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Cell } from "recharts";

interface DataPoint {
  pagesViewed: number;
  purchaseRate: number;
  sessions: number;
  label: string;
}

interface ScatterDiagnosticProps {
  data: DataPoint[];
  height?: number;
}

const chartConfig = {
  sessions: {
    label: "Sessions",
    color: "#3B82F6", // Blue
  },
} satisfies ChartConfig;

// Neo-brutalist color palette for bubbles
const BUBBLE_COLORS = ["#FF6B6B", "#4ECDC4", "#FFE135", "#A855F7", "#3B82F6"];

export function ScatterDiagnostic({ data, height = 300 }: ScatterDiagnosticProps) {
  if (data.length === 0) return null;

  // Transform data to match Recharts format
  const chartData = data.map((d, i) => ({
    x: d.pagesViewed,
    y: d.purchaseRate,
    z: d.sessions,
    label: d.label,
    colorIndex: i % BUBBLE_COLORS.length,
  }));

  // Calculate axis domains with padding to spread data across the chart
  const xValues = chartData.map(d => d.x);
  const yValues = chartData.map(d => d.y);
  
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const xRange = xMax - xMin || 1;
  const xPadding = xRange * 0.2;
  const xDomain: [number, number] = [Math.max(0, xMin - xPadding), xMax + xPadding];
  
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yRange = yMax - yMin || 0.01;
  const yPadding = yRange * 0.2;
  const yDomain: [number, number] = [Math.max(0, yMin - yPadding), yMax + yPadding];

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 50, left: 60 }}>
        <CartesianGrid 
          strokeDasharray="0"
          stroke="#1a1a1a"
          strokeWidth={1}
          strokeOpacity={0.15}
        />
        <XAxis
          type="number"
          dataKey="x"
          name="Pages Viewed"
          tickLine={false}
          axisLine={{ stroke: '#1a1a1a', strokeWidth: 2 }}
          fontSize={11}
          fontWeight={700}
          tick={{ fill: '#1a1a1a' }}
          domain={xDomain}
          label={{ value: 'Pages Viewed', position: 'bottom', offset: 5, fontSize: 12, fontWeight: 700, fill: '#1a1a1a' }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Purchase Rate"
          tickLine={false}
          axisLine={{ stroke: '#1a1a1a', strokeWidth: 2 }}
          tickFormatter={(value) => formatPercent(value, 0)}
          fontSize={11}
          fontWeight={700}
          tick={{ fill: '#1a1a1a' }}
          domain={yDomain}
          label={{ value: 'Purchase Rate', angle: -90, position: 'insideLeft', offset: 15, fontSize: 12, fontWeight: 700, fill: '#1a1a1a' }}
        />
        <ZAxis
          type="number"
          dataKey="z"
          range={[100, 600]}
          name="Sessions"
        />
        <ChartTooltip
          cursor={{ strokeDasharray: '0', stroke: '#1a1a1a', strokeWidth: 2 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div className="border-3 border-foreground bg-background p-3 shadow-brutal">
                <p className="font-black text-sm uppercase tracking-wide">{d.label}</p>
                <div className="mt-2 space-y-1 text-xs font-bold">
                  <p><span className="text-muted-foreground">Pages:</span> <span className="text-[#3B82F6]">{d.x.toFixed(1)}</span></p>
                  <p><span className="text-muted-foreground">Rate:</span> <span className="text-[#4ECDC4]">{formatPercent(d.y, 1)}</span></p>
                  <p><span className="text-muted-foreground">Sessions:</span> <span className="text-[#A855F7]">{formatNumber(d.z)}</span></p>
                </div>
              </div>
            );
          }}
        />
        <Scatter data={chartData}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={BUBBLE_COLORS[entry.colorIndex]!}
              stroke="#1a1a1a"
              strokeWidth={2}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ChartContainer>
  );
}
