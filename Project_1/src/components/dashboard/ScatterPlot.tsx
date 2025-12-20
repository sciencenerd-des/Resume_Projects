"use client";

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Cell, ReferenceLine, Label } from "recharts";
import { formatCurrency } from "@/lib/format";

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
const BUBBLE_COLORS = ["#4ECDC4", "#FF6B6B", "#FFE135", "#A855F7", "#3B82F6", "#FF9F1C"];

// Map Tailwind class names to hex colors for OS-based coloring
const COLOR_MAP: Record<string, string> = {
  "fill-emerald-500/80": "#10B981",
  "fill-rose-500/80": "#F43F5E",
  "fill-indigo-500/80": "#6366F1",
  "fill-primary/70": "#4ECDC4",
};

export function ScatterPlot({ 
  points, 
  xLabel, 
  yLabel, 
  xFormatter, 
  yFormatter, 
  height = 350 
}: ScatterProps) {
  if (!points.length) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground font-bold border-3 border-dashed border-foreground/20 rounded-lg">No data available for this selection</div>;
  }

  // Transform data for Recharts
  const chartData = points.map((point, i) => ({
    x: point.x,
    y: point.y,
    z: point.size ?? 1,
    label: point.label,
    color: point.color ? (COLOR_MAP[point.color] ?? BUBBLE_COLORS[i % BUBBLE_COLORS.length]) : BUBBLE_COLORS[i % BUBBLE_COLORS.length],
    ratio: point.x > 0 ? point.y / point.x : 0
  }));

  // Calculate dynamic domains with padding
  const minX = Math.min(...chartData.map(p => p.x));
  const maxX = Math.max(...chartData.map(p => p.x));
  const minY = Math.min(...chartData.map(p => p.y));
  const maxY = Math.max(...chartData.map(p => p.y));

  const xPadding = (maxX - minX) * 0.15 || maxX * 0.15 || 10;
  // Larger Y padding at bottom to account for bubble size and keep them above x-axis
  const yPaddingTop = (maxY - minY) * 0.15 || maxY * 0.15 || 100;
  const yPaddingBottom = Math.max((maxY - minY) * 0.25, 500); // More padding at bottom for bubbles

  const xDomain: [number, number] = [Math.max(0, minX - xPadding), maxX + xPadding];
  // Ensure minimum Y is high enough to keep bubbles above x-axis
  const yDomain: [number, number] = [Math.max(0, minY - yPaddingBottom), maxY + yPaddingTop];

  return (
    <div className="w-full">
      {/* Legend for reference lines */}
      <div className="flex gap-6 mb-2 text-xs font-bold">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-[#4ECDC4]" style={{ borderTop: '2px dashed #4ECDC4' }} />
          <span style={{ color: '#4ECDC4' }}>3x (Healthy)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-[#A855F7]" style={{ borderTop: '2px dashed #A855F7' }} />
          <span style={{ color: '#A855F7' }}>6x (Great)</span>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 80 }}>
        <CartesianGrid 
          strokeDasharray="4 4"
          stroke="#1a1a1a"
          strokeWidth={1}
          strokeOpacity={0.1}
        />
        
        {/* Reference Lines for LTV:CAC Ratios */}
        <ReferenceLine 
          segment={[{ x: 0, y: 0 }, { x: xDomain[1], y: xDomain[1] * 3 }]} 
          stroke="#4ECDC4" 
          strokeWidth={2} 
          strokeDasharray="8 4"
          strokeOpacity={0.6}
        />
        
        <ReferenceLine 
          segment={[{ x: 0, y: 0 }, { x: xDomain[1], y: xDomain[1] * 6 }]} 
          stroke="#A855F7" 
          strokeWidth={2} 
          strokeDasharray="8 4"
          strokeOpacity={0.6}
        />

        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          tickLine={false}
          axisLine={{ stroke: '#1a1a1a', strokeWidth: 3 }}
          tickFormatter={xFormatter}
          fontSize={11}
          fontWeight={800}
          tick={{ fill: '#1a1a1a' }}
          domain={xDomain}
          label={{ value: xLabel, position: 'insideBottom', offset: -15, fontSize: 13, fontWeight: 900, fill: '#1a1a1a' }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          tickLine={false}
          axisLine={{ stroke: '#1a1a1a', strokeWidth: 3 }}
          tickFormatter={yFormatter}
          fontSize={11}
          fontWeight={800}
          tick={{ fill: '#1a1a1a' }}
          domain={yDomain}
          width={70}
          label={{ value: yLabel, angle: -90, position: 'outside', dx: -15, fontSize: 12, fontWeight: 900, fill: '#1a1a1a' }}
          allowDataOverflow={false}
        />
        <ZAxis
          type="number"
          dataKey="z"
          range={[60, 250]}
          name="Size"
        />
        <ChartTooltip
          cursor={{ strokeDasharray: '0', stroke: '#1a1a1a', strokeWidth: 2, opacity: 0.2 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div className="border-4 border-foreground bg-background p-4 shadow-brutal min-w-[180px]">
                <p className="font-black text-base uppercase tracking-wider border-b-3 border-foreground pb-1 mb-2">
                  {d.label}
                </p>
                <div className="space-y-2 text-sm font-bold">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-widest">CAC</span>
                    <span className="text-foreground">{xFormatter ? xFormatter(d.x) : d.x.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-widest">LTV</span>
                    <span className="text-foreground">{yFormatter ? yFormatter(d.y) : d.y.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between gap-4 pt-1 border-t-2 border-foreground/10">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Ratio</span>
                    <span className={`px-2 py-0.5 rounded text-background font-black ${d.ratio >= 3 ? "bg-emerald-500" : "bg-rose-500"}`}>
                      {d.ratio.toFixed(2)}x
                    </span>
                  </div>
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
              fillOpacity={0.85}
              stroke="#1a1a1a"
              strokeWidth={2}
              filter="drop-shadow(3px 3px 0px rgba(0,0,0,0.8))"
              style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ChartContainer>
    </div>
  );
}

