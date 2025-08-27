"use client"
import { Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const handleToggle = () => {
    // Mock theme toggle for testing
    console.log("Theme toggle clicked (disabled for testing)")
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleToggle}>
      <Sun className="h-4 w-4" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
