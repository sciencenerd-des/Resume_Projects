"use client";

import { useState } from "react";
import { Book, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GLOSSARY_TERMS = [
  {
    term: "CAC",
    fullName: "Customer Acquisition Cost",
    definition: "Total marketing spend divided by number of new customers acquired. A CAC of ₹500 means it costs ₹500 in marketing to acquire each new customer.",
    usage: "Used in LTV:CAC ratio, Channel Economics section",
  },
  {
    term: "LTV",
    fullName: "Lifetime Value",
    definition: "Predicted total revenue a customer will generate over their entire relationship with the business. Calculated using average order value, purchase frequency, and retention rates.",
    usage: "Used in LTV:CAC ratio, Channel Economics section",
  },
  {
    term: "LTV:CAC Ratio",
    fullName: "Lifetime Value to Customer Acquisition Cost Ratio",
    definition: "Measures the relationship between customer value and acquisition cost. A ratio of 3:1 or higher is generally considered healthy—meaning you earn ₹3 for every ₹1 spent acquiring customers.",
    usage: "Executive Overview KPIs, Channel Economics scatter plot",
  },
  {
    term: "Synthetic Spend",
    fullName: "Assumed Marketing Spend",
    definition: "Estimated marketing spend when actual spend data is unavailable. Based on industry benchmarks and channel-specific assumptions defined in assumed_channel_costs.csv.",
    usage: "Channel Economics section, CAC calculations",
  },
  {
    term: "Cohort",
    fullName: "User Cohort",
    definition: "A group of users who started using the product during the same time period (typically a month). Cohorts allow tracking retention over time for specific acquisition periods.",
    usage: "Retention section heatmap",
  },
  {
    term: "Retention Rate",
    fullName: "Customer Retention Rate",
    definition: "Percentage of customers from a cohort who return in subsequent months. M1 retention of 25% means 25% of customers came back in the month after their first visit.",
    usage: "Retention section heatmap",
  },
  {
    term: "AOV",
    fullName: "Average Order Value",
    definition: "Total revenue divided by number of purchases. Represents the average amount spent per transaction.",
    usage: "Executive Overview KPIs, Funnel metrics",
  },
  {
    term: "Purchase Rate",
    fullName: "Session to Purchase Conversion Rate",
    definition: "Percentage of sessions that result in a purchase. Calculated as purchases ÷ sessions × 100.",
    usage: "Funnel section, Device diagnostics",
  },
] as const;

interface GlossaryProps {
  variant?: "panel" | "compact";
}

export function Glossary({ variant = "panel" }: GlossaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  if (variant === "compact") {
    return (
      <div className="relative inline-block">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={isExpanded}
          aria-label="Toggle glossary"
        >
          <Info className="size-3.5" />
          <span className="underline decoration-dashed underline-offset-2">What does this mean?</span>
        </button>
        {isExpanded && (
          <div className="absolute top-full left-0 mt-2 z-50 w-80 border-3 border-foreground bg-background shadow-brutal-lg p-4">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {GLOSSARY_TERMS.slice(0, 4).map(item => (
                <div key={item.term} className="text-sm">
                  <p className="font-black">{item.term}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{item.definition}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="border-brutal-2 shadow-brutal">
      <CardHeader className="pb-2">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2">
            <Book className="size-4" />
            <CardTitle className="text-sm">Glossary of Terms</CardTitle>
          </div>
          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {GLOSSARY_TERMS.map(item => (
              <div 
                key={item.term}
                className="border-2 border-foreground/20 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedTerm(expandedTerm === item.term ? null : item.term)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-sm">{item.term}</span>
                    <span className="text-muted-foreground text-xs ml-2">({item.fullName})</span>
                  </div>
                  {expandedTerm === item.term ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                </div>
                {expandedTerm === item.term && (
                  <div className="mt-2 pt-2 border-t border-foreground/10">
                    <p className="text-sm text-foreground">{item.definition}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="font-bold">Used in:</span> {item.usage}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Export individual term tooltip for inline use
export function TermTooltip({ term }: { term: keyof typeof TERM_MAP }) {
  const info = TERM_MAP[term];
  const [isOpen, setIsOpen] = useState(false);
  
  if (!info) return <span>{term}</span>;
  
  return (
    <span className="relative inline-block">
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="underline decoration-dashed decoration-muted-foreground underline-offset-2 cursor-help"
        aria-label={`Definition of ${term}`}
      >
        {term}
      </button>
      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 border-3 border-foreground bg-background shadow-brutal p-3 text-xs">
          <p className="font-black">{info.fullName}</p>
          <p className="text-muted-foreground mt-1">{info.definition}</p>
        </div>
      )}
    </span>
  );
}

const TERM_MAP: Record<string, { fullName: string; definition: string }> = Object.fromEntries(
  GLOSSARY_TERMS.map(item => [item.term, { fullName: item.fullName, definition: item.definition }])
);
