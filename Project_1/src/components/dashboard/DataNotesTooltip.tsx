import { Info } from "lucide-react";

export function DataNotesTooltip() {
  return (
    <div className="group relative inline-flex items-center">
      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <Info className="size-3.5" />
        <span>Data Notes</span>
      </button>
      <div className="absolute bottom-full left-0 mb-2 w-72 p-3 bg-popover border-2 border-foreground shadow-brutal-sm 
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <p className="text-xs font-semibold mb-2">Data Quality Notes</p>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>• Revenue = 0 in 77.5% of sessions (non-purchase)</li>
          <li>• 42% cart abandonment rate</li>
          <li>• Device mapping: 0=Desktop, 1=Mobile, 2=Tablet</li>
          <li>• Location IDs (0–224) are anonymized</li>
          <li>• CAC values are synthetic estimates</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-muted">
          See <span className="font-mono text-[10px]">validation_report.md</span> for details
        </p>
      </div>
    </div>
  );
}
