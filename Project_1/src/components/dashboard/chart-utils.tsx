// Chart Utilities for consistent styling and functionality
export const CHART_CONFIG = {
  // Common padding values
  padding: {
    small: { top: 15, right: 15, bottom: 30, left: 30 },
    medium: { top: 20, right: 20, bottom: 40, left: 40 },
    large: { top: 30, right: 30, bottom: 60, left: 60 }
  },
  
  // Grid line styles
  grid: {
    stroke: 'currentColor',
    strokeOpacity: 0.15,
    strokeWidth: 0.5
  },
  
  // Axis styles
  axis: {
    stroke: 'currentColor',
    strokeWidth: 1
  },
  
  // Tick mark styles
  tick: {
    stroke: 'currentColor',
    strokeWidth: 1
  },
  
  // Text styles
  text: {
    muted: 'fill-muted-foreground text-sm font-medium',
    primary: 'fill-primary text-sm font-medium',
    secondary: 'fill-secondary text-sm font-medium',
    accent: 'fill-accent text-sm font-medium'
  },
  
  // Legend styles
  legend: {
    gap: 8,
    itemGap: 2,
    textSize: 'text-xs'
  },
  
  // Default colors
  colors: {
    primary: 'fill-primary/70',
    primaryLight: 'fill-primary/40',
    primaryDark: 'fill-primary/90',
    secondary: 'fill-secondary/70',
    accent: 'fill-accent/70',
    success: 'fill-emerald-500/60',
    warning: 'fill-amber-500/60',
    danger: 'fill-rose-500/60'
  }
};

// Common chart functions
export const formatAxisValue = (value: number, formatter?: (value: number) => string) => {
  return formatter ? formatter(value) : value.toFixed(1);
};

export const calculateScale = (value: number, max: number, range: number, padding: { top: number; bottom: number }) => {
  return range - padding.bottom - ((value / max) * (range - padding.top - padding.bottom));
};

export const calculateXScale = (value: number, max: number, range: number, padding: { left: number; right: number }) => {
  return padding.left + ((value / max) * (range - padding.left - padding.right));
};

export const shouldShowLabel = (index: number, total: number, value: number, values: number[]) => {
  // Show labels for first and last points, or significant points
  return index === 0 || index === total - 1 || 
         (index > 0 && index < total - 1 && 
          ((value > (values[index-1] ?? 0) && value > (values[index+1] ?? 0)) ||
           (value < (values[index-1] ?? 0) && value < (values[index+1] ?? 0))));
};

// Chart dimensions
export const CHART_DIMENSIONS = {
  defaultHeight: 300,
  smallHeight: 240,
  mediumHeight: 280,
  largeHeight: 320
};

// Legend item types
export type LegendItem = {
  label: string;
  color: string;
  size?: number;
  type?: 'circle' | 'line' | 'square';
};

// Create legend items
export const createLegendItems = (items: LegendItem[]) => {
  return items.map((item, index) => (
    <div key={index} className="flex items-center gap-2">
      {item.type === 'line' ? (
        <div className={`w-4 h-0.5 ${item.color} rounded`} />
      ) : item.type === 'square' ? (
        <div className={`w-4 h-4 ${item.color} border border-foreground`} />
      ) : (
        <div className={`w-4 h-4 ${item.color} border border-foreground rounded-full`} />
      )}
      <span className="text-muted-foreground text-xs">{item.label}</span>
    </div>
  ));
};