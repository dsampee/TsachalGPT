"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function UserNav() {
  return (
    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-emerald-100 text-emerald-700">U</AvatarFallback>
      </Avatar>
    </Button>
  )
}
