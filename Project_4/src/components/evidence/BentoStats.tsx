/**
 * BentoStats Component
 * @version 1.0.0
 * Bento-grid display of evidence ledger statistics
 */

import * as React from "react"
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Shield,
  FileText,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { EvidenceLedger } from "@/types"

interface BentoStatsProps {
  ledger: EvidenceLedger | null
  documentCount?: number
  className?: string
}

export function BentoStats({ ledger, documentCount = 0, className }: BentoStatsProps) {
  const summary = ledger?.summary ?? {
    total_claims: 0,
    supported: 0,
    weak: 0,
    contradicted: 0,
    not_found: 0,
  }

  const coveragePercent = summary.total_claims > 0
    ? Math.round(((summary.supported + summary.weak) / summary.total_claims) * 100)
    : 0

  const supportedPercent = summary.total_claims > 0
    ? Math.round((summary.supported / summary.total_claims) * 100)
    : 0

  return (
    <div className={cn("grid grid-cols-4 gap-3", className)}>
      {/* Coverage - Large tile */}
      <Card className="col-span-2 row-span-2 p-5 bg-gradient-to-br from-card to-card/80 border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Evidence Coverage</span>
        </div>
        <div className="flex items-end gap-3 mb-4">
          <span className={cn(
            "text-5xl font-bold tracking-tight",
            coveragePercent >= 85 ? "text-verdict-supported" :
            coveragePercent >= 70 ? "text-verdict-weak" :
            "text-verdict-contradicted"
          )}>
            {coveragePercent}%
          </span>
          {coveragePercent >= 85 && (
            <span className="text-xs text-verdict-supported bg-verdict-supported/10 px-2 py-1 rounded-full mb-2">
              Target Met
            </span>
          )}
        </div>
        <Progress
          value={coveragePercent}
          className="h-2"
        />
        <p className="text-xs text-muted-foreground mt-3">
          {summary.supported + summary.weak} of {summary.total_claims} claims verified
        </p>
      </Card>

      {/* Supported */}
      <StatTile
        icon={<CheckCircle className="h-4 w-4" />}
        label="Supported"
        value={summary.supported}
        percent={supportedPercent}
        colorClass="text-verdict-supported"
        bgClass="bg-verdict-supported/10"
      />

      {/* Weak */}
      <StatTile
        icon={<AlertTriangle className="h-4 w-4" />}
        label="Weak"
        value={summary.weak}
        percent={summary.total_claims > 0 ? Math.round((summary.weak / summary.total_claims) * 100) : 0}
        colorClass="text-verdict-weak"
        bgClass="bg-verdict-weak/10"
      />

      {/* Contradicted */}
      <StatTile
        icon={<XCircle className="h-4 w-4" />}
        label="Contradicted"
        value={summary.contradicted}
        percent={summary.total_claims > 0 ? Math.round((summary.contradicted / summary.total_claims) * 100) : 0}
        colorClass="text-verdict-contradicted"
        bgClass="bg-verdict-contradicted/10"
      />

      {/* Not Found */}
      <StatTile
        icon={<HelpCircle className="h-4 w-4" />}
        label="Not Found"
        value={summary.not_found}
        percent={summary.total_claims > 0 ? Math.round((summary.not_found / summary.total_claims) * 100) : 0}
        colorClass="text-verdict-missing"
        bgClass="bg-verdict-missing/10"
      />

      {/* Documents - spans bottom */}
      <Card className="col-span-2 p-4 bg-card border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{documentCount}</p>
              <p className="text-xs text-muted-foreground">Documents indexed</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Ready
          </div>
        </div>
      </Card>

      {/* Total Claims */}
      <Card className="col-span-2 p-4 bg-card border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{summary.total_claims}</p>
              <p className="text-xs text-muted-foreground">Total claims analyzed</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
  percent,
  colorClass,
  bgClass,
}: {
  icon: React.ReactNode
  label: string
  value: number
  percent: number
  colorClass: string
  bgClass: string
}) {
  return (
    <Card className="p-4 bg-card border-border/50 transition-colors hover:bg-accent/5">
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-3", bgClass)}>
        <span className={colorClass}>{icon}</span>
      </div>
      <p className={cn("text-2xl font-bold", colorClass)}>{value}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("text-xs font-medium", colorClass)}>{percent}%</span>
      </div>
    </Card>
  )
}

export default BentoStats
