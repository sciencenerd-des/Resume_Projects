import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { RotateCcw, Calculator } from "lucide-react";

interface ChannelData {
  channelId: number;
  label: string;
  newCustomers: number;
  ltv: number;
  cac: number;
  syntheticSpend: number;
}

interface WhatIfPanelProps {
  channels: ChannelData[];
  onCacChange?: (channelId: number, newCac: number) => void;
}

export function WhatIfPanel({ channels }: WhatIfPanelProps) {
  const initialCacs = useMemo(() => {
    return Object.fromEntries(channels.map(c => [c.channelId, c.cac]));
  }, [channels]);

  const [cacOverrides, setCacOverrides] = useState<Record<number, number>>(initialCacs);

  const resetToDefaults = () => {
    setCacOverrides(initialCacs);
  };

  const updateCac = (channelId: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setCacOverrides(prev => ({ ...prev, [channelId]: numValue }));
    }
  };

  const adjustedMetrics = useMemo(() => {
    return channels.map(channel => {
      const newCac = cacOverrides[channel.channelId] ?? channel.cac;
      const newSpend = newCac * channel.newCustomers;
      const ltvToCac = newCac > 0 ? channel.ltv / newCac : 0;
      return {
        ...channel,
        adjustedCac: newCac,
        adjustedSpend: newSpend,
        adjustedLtvToCac: ltvToCac,
        cacDelta: newCac - channel.cac,
        isImproved: ltvToCac > (channel.ltv / channel.cac),
      };
    });
  }, [channels, cacOverrides]);

  const totalOriginalSpend = channels.reduce((sum, c) => sum + c.syntheticSpend, 0);
  const totalAdjustedSpend = adjustedMetrics.reduce((sum, c) => sum + c.adjustedSpend, 0);
  const spendDelta = totalAdjustedSpend - totalOriginalSpend;

  const hasChanges = Object.entries(cacOverrides).some(
    ([id, cac]) => cac !== initialCacs[parseInt(id)]
  );

  return (
    <Card className="border-3 border-dashed border-amber-500/50 bg-amber-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-amber-600" />
            <CardTitle className="text-base">What-If Scenario</CardTitle>
          </div>
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={resetToDefaults} className="gap-1.5">
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          )}
        </div>
        <CardDescription>
          Adjust CAC assumptions to see impact on unit economics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CAC Inputs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map(channel => {
            const current = cacOverrides[channel.channelId] ?? channel.cac;
            const adjusted = adjustedMetrics.find(m => m.channelId === channel.channelId);
            const delta = adjusted?.cacDelta ?? 0;

            return (
              <div key={channel.channelId} className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  {channel.label}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    value={current}
                    onChange={e => updateCac(channel.channelId, e.target.value)}
                    className="h-8 text-sm font-mono"
                  />
                  {delta !== 0 && (
                    <span className={`text-xs font-semibold ${delta < 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {delta > 0 ? "+" : ""}{delta.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Impact Summary */}
        <div className="border-t-2 border-foreground/10 pt-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Original Spend</p>
              <p className="text-lg font-semibold">{formatCurrency(totalOriginalSpend, 0)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adjusted Spend</p>
              <p className="text-lg font-semibold">{formatCurrency(totalAdjustedSpend, 0)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Spend Delta</p>
              <p className={`text-lg font-semibold ${spendDelta < 0 ? "text-emerald-600" : spendDelta > 0 ? "text-rose-600" : ""}`}>
                {spendDelta >= 0 ? "+" : ""}{formatCurrency(spendDelta, 0)}
              </p>
            </div>
          </div>
        </div>

        {/* LTV:CAC Table */}
        {hasChanges && (
          <div className="border-t-2 border-foreground/10 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Adjusted LTV:CAC</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {adjustedMetrics.map(m => (
                <div key={m.channelId} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className={`font-semibold ${m.isImproved ? "text-emerald-600" : "text-rose-600"}`}>
                    {m.adjustedLtvToCac.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
