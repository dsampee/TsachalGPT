"use client"

import type * as React from "react"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <div data-theme="light">{children}</div>
}
