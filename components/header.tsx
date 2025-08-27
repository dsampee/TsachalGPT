"use client"

import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Badge } from "@/components/ui/badge"
import { UserNav } from "@/components/user-nav"
import { FileText, Settings, Library, Plus } from "lucide-react"

interface HeaderProps {
  currentView: string
  onViewChange: (view: "welcome" | "generator" | "library") => void
  onViewLibrary: () => void
}

export function Header({ currentView, onViewChange, onViewLibrary }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-black font-montserrat text-foreground">TsachalGPT</h1>
            </div>
            <Badge variant="secondary" className="text-xs">
              Professional
            </Badge>
          </div>

          <nav className="flex items-center gap-1">
            <Button
              variant={currentView === "welcome" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange("welcome")}
            >
              Dashboard
            </Button>
            <Button
              variant={currentView === "generator" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange("generator")}
            >
              <Plus className="mr-1 h-3 w-3" />
              Generate
            </Button>
            <Button variant={currentView === "library" ? "default" : "ghost"} size="sm" onClick={onViewLibrary}>
              <Library className="mr-1 h-3 w-3" />
              Library
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  )
}
