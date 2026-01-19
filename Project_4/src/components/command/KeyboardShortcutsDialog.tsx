/**
 * KeyboardShortcutsDialog Component
 * @version 1.0.0
 * Dialog showing all available keyboard shortcuts
 */

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Keyboard } from "lucide-react"
import { cn } from "@/lib/utils"

interface ShortcutGroup {
  title: string
  shortcuts: {
    keys: string[]
    description: string
  }[]
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["⌘", "L"], description: "Toggle evidence ledger" },
      { keys: ["⌘", "U"], description: "Upload documents" },
      { keys: ["⌘", "N"], description: "New query" },
      { keys: ["ESC"], description: "Close dialog / Cancel" },
    ],
  },
  {
    title: "Command Palette",
    shortcuts: [
      { keys: ["↑", "↓"], description: "Navigate items" },
      { keys: ["↵"], description: "Select item" },
      { keys: ["ESC"], description: "Close palette" },
    ],
  },
  {
    title: "Chat",
    shortcuts: [
      { keys: ["↵"], description: "Send message" },
      { keys: ["Shift", "↵"], description: "New line" },
    ],
  },
]

interface KeyboardShortcutsDialogProps {
  trigger?: React.ReactNode
}

export function KeyboardShortcutsDialog({ trigger }: KeyboardShortcutsDialogProps) {
  const [open, setOpen] = React.useState(false)

  // Listen for ? key to open shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        // Only if not in an input
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault()
          setOpen(true)
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Keyboard className="h-4 w-4 mr-2" />
            Shortcuts
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium text-foreground mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd
                            className={cn(
                              "inline-flex items-center justify-center",
                              "min-w-[24px] h-6 px-1.5",
                              "rounded border border-border bg-muted",
                              "text-xs font-mono text-foreground"
                            )}
                          >
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">?</kbd> anywhere to open this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default KeyboardShortcutsDialog
