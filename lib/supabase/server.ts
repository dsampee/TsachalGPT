import { cookies, headers } from "next/headers"
import { createServerClient as _createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

export function getServerSupabase(): SupabaseClient {
  const cookieStore = cookies()
  return _createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
    headers: {
      "x-forwarded-for": headers().get("x-forwarded-for") || "",
      "user-agent": headers().get("user-agent") || "",
    },
  })
}

export function createServerClient() {
  return getServerSupabase()
}

export async function createClient() {
  return getServerSupabase()
}
