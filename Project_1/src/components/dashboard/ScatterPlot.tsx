"use client";

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Cell } from "recharts";

interface ScatterPoint {
  x: number;
  y: number;
  label: string;
  size?: number;
  color?: string;
}

interface ScatterProps {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  xFormatter?: (value: number) => string;
  yFormatter?: (value: number) => string;
  height?: number;
}

const chartConfig = {
  data: {
    label: "Data",
    color: "#4ECDC4",
  },
} satisfies ChartConfig;

// Neo-brutalist color palette
const BUBBLE_COLORS = ["#4ECDC4", "#FF6B6B", "#FFE135", "#A855F7", "#3B82F6"];

// Map Tailwind class names to hex colors for OS-based coloring
const COLOR_MAP: Record<string, string> = {
  "fill-emerald-500/80": "#10B981",
  "fill-indigo-500/80": "#6366F1",
  "fill-primary/70": "#4ECDC4",
};

export function ScatterPlot({ 
  points, 
  xLabel, 
  yLabel, 
  xFormatter, 
  yFormatter, 
  height = 300 
}: ScatterProps) {
  if (!points.length) {
    return <div className="text-sm text-muted-foreground font-bold">No data</div>;
  }

  // Transform data for Recharts - preserve original color if provided
  const chartData = points.map((point, i) => ({
    x: point.x,
    y: point.y,
    z: point.size ?? 1,
    label: point.label,
    color: point.color ? (COLOR_MAP[point.color] ?? BUBBLE_COLORS[i % BUBBLE_COLORS.length]) : BUBBLE_COLORS[i % BUBBLE_COLORS.length],
  }));

  // Use clean fixed domain ranges for better scaling
  const xDomain: [number, number] = [0, 14];
  const yDomain: [number, number] = [0, 12000];

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <ScatterChart margin={{ top: 20, right: 40, bottom: 50, left: 70 }}>
        <CartesianGrid 
          strokeDasharray="0"
          stroke="#1a1a1a"
          strokeWidth={1}
          strokeOpacity={0.15}
        />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          tickLine={false}
          axisLine={{ stroke: '#1a1a1a', strokeWidth: 2 }}
          tickFormatter={xFormatter}
          fontSize={11}
          fontWeight={700}
          tick={{ fill: '#1a1a1a' }}
          domain={xDomain}
          ticks={[0, 2, 4, 6, 8, 10, 12, 14]}
          label={{ value: xLabel, position: 'insideBottom', offset: -10, fontSize: 12, fontWeight: 700, fill: '#1a1a1a' }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          tickLine={false}
          axisLine={{ stroke: '#1a1a1a', strokeWidth: 2 }}
          tickFormatter={yFormatter}
          fontSize={11}
          fontWeight={700}
          tick={{ fill: '#1a1a1a' }}
          domain={yDomain}
          ticks={[0, 3000, 6000, 9000, 12000]}
          width={70}
          label={{ value: yLabel, angle: -90, position: 'center', dx: -30, fontSize: 12, fontWeight: 700, fill: '#1a1a1a' }}
        />
        <ZAxis
          type="number"
          dataKey="z"
          range={[80, 400]}
          name="Size"
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
                  <p>
                    <span className="text-muted-foreground">{xLabel}:</span>{' '}
                    <span className="text-[#4ECDC4]">{xFormatter ? xFormatter(d.x) : d.x.toFixed(1)}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">{yLabel}:</span>{' '}
                    <span className="text-[#A855F7]">{yFormatter ? yFormatter(d.y) : d.y.toFixed(1)}</span>
                  </p>
                </div>
              </div>
            );
          }}
        />
        <Scatter data={chartData}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              stroke="#1a1a1a"
              strokeWidth={2}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ChartContainer>
  );
}
