import * as React from "react"
import { cn } from "@/lib/utils"

interface ShortcutHint {
  keys: string
  label: string
}

const shortcuts: ShortcutHint[] = [
  { keys: "⌘K", label: "Search" },
  { keys: "⌘L", label: "Ledger" },
  { keys: "⌘U", label: "Upload" },
  { keys: "⌘N", label: "New Query" },
]

export function ShortcutsFooter({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-6 text-xs text-muted-foreground", className)}>
      {shortcuts.map(({ keys, label }) => (
        <span key={keys} className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
            {keys}
          </kbd>
          <span>{label}</span>
        </span>
      ))}
    </div>
  )
}
