import * as React from "react"
import { Command } from "cmdk"
import { useNavigate } from "react-router-dom"
import {
  Search,
  FileText,
  Upload,
  MessageSquare,
  History,
  Settings,
  Moon,
  Sun,
  LogOut,
  Plus,
  FolderOpen,
  BarChart3,
} from "lucide-react"
import { useConvexWorkspace } from "@/hooks/useConvexWorkspace"
import { useConvexAuthState } from "@/hooks/useConvexAuth"
import { useTheme } from "@/contexts/ThemeContext"
import { cn } from "@/lib/utils"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { currentWorkspace, workspaces } = useConvexWorkspace()
  const { signOut } = useConvexAuthState()
  const { theme, toggleTheme } = useTheme()
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }

      // Quick shortcuts when palette is closed
      if (!open && (e.metaKey || e.ctrlKey)) {
        if (e.key === "l") {
          e.preventDefault()
          // Toggle ledger (handled by ChatPage)
          window.dispatchEvent(new CustomEvent("toggle-ledger"))
        }
        if (e.key === "u") {
          e.preventDefault()
          if (currentWorkspace?._id) {
            navigate(`/workspaces/${currentWorkspace._id}/documents`)
          }
        }
        if (e.key === "n") {
          e.preventDefault()
          if (currentWorkspace?._id) {
            navigate(`/workspaces/${currentWorkspace._id}/chat`)
          }
        }
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange, navigate, currentWorkspace])

  const runCommand = React.useCallback((command: () => void) => {
    onOpenChange(false)
    command()
  }, [onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Dialog */}
      <div className="fixed left-1/2 top-[20%] w-full max-w-[640px] -translate-x-1/2">
        <Command
          className={cn(
            "bg-card border border-border rounded-xl shadow-2xl overflow-hidden",
            "animate-slide-in"
          )}
          loop
        >
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search commands, documents, or ask a question..."
              className="flex h-14 w-full bg-transparent py-3 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Navigation Group */}
            <Command.Group heading="Navigation" className="px-2 py-1.5">
              <Command.Item
                onSelect={() => runCommand(() => currentWorkspace?._id && navigate(`/workspaces/${currentWorkspace._id}/chat`))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>New Query</span>
                <kbd className="ml-auto text-xs text-muted-foreground">⌘N</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => currentWorkspace?._id && navigate(`/workspaces/${currentWorkspace._id}/documents`))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span>Upload Documents</span>
                <kbd className="ml-auto text-xs text-muted-foreground">⌘U</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent("toggle-ledger")))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span>Toggle Evidence Ledger</span>
                <kbd className="ml-auto text-xs text-muted-foreground">⌘L</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate("/workspaces"))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span>Switch Workspace</span>
              </Command.Item>
            </Command.Group>

            <Command.Separator className="my-2 h-px bg-border" />

            {/* Workspaces Group */}
            {workspaces && workspaces.length > 0 && (
              <>
                <Command.Group heading="Workspaces" className="px-2 py-1.5">
                  {workspaces.filter((w): w is NonNullable<typeof w> => w !== null).map((workspace) => (
                    <Command.Item
                      key={workspace._id}
                      onSelect={() => runCommand(() => navigate(`/workspaces/${workspace._id}`))}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/10 aria-selected:bg-accent/10"
                    >
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{workspace.name}</span>
                      {workspace._id === currentWorkspace?._id && (
                        <span className="ml-auto text-xs text-primary">Current</span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Separator className="my-2 h-px bg-border" />
              </>
            )}

            {/* Actions Group */}
            <Command.Group heading="Actions" className="px-2 py-1.5">
              <Command.Item
                onSelect={() => runCommand(toggleTheme)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                )}
                <span>Toggle Theme</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => signOut())}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-destructive hover:bg-destructive/10 aria-selected:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>ESC Close</span>
            </div>
            <span>⌘K to search</span>
          </div>
        </Command>
      </div>
    </div>
  )
}
