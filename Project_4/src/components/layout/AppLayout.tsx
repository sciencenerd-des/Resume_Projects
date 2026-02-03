import * as React from "react"
import { Outlet } from "react-router-dom"
import { Search, Moon, Sun, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCommand } from "@/contexts/CommandContext"
import { useConvexAuthState } from "@/hooks/useConvexAuth"
import { useTheme } from "@/contexts/ThemeContext"
import { useConvexWorkspace } from "@/hooks/useConvexWorkspace"
import { ShortcutsFooter } from "@/components/command/ShortcutsFooter"

export function AppLayout() {
  const { setOpen } = useCommand()
  const { user, signOut } = useConvexAuthState()
  const { theme, toggleTheme } = useTheme()
  const { currentWorkspace } = useConvexWorkspace()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left: Command Palette Trigger */}
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
            className="w-64 justify-start text-muted-foreground hover:text-foreground"
          >
            <Search className="mr-2 h-4 w-4" />
            <span className="flex-1 text-left">Search or ask...</span>
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium">
              ⌘K
            </kbd>
          </Button>

          {/* Center: Logo/Workspace */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <span className="font-semibold text-foreground">VerityDraft</span>
            {currentWorkspace && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{currentWorkspace.name}</span>
              </>
            )}
          </div>

          {/* Right: Theme & User */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.email}</p>
                    <p className="text-xs text-muted-foreground">Signed in</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Bottom Shortcuts Footer */}
      <footer className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-10 items-center justify-center px-4">
          <ShortcutsFooter />
        </div>
      </footer>
    </div>
  )
}

export default AppLayout
