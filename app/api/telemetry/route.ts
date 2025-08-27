import { NextResponse } from "next/server"
import { getServerSupabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET() {
  console.log("[v0] Telemetry API: Starting GET request")

  try {
    const supabase = getServerSupabase()
    console.log("[v0] Telemetry API: Created Supabase client")

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    console.log("[v0] Telemetry API: Auth check result", { user: user?.id, error: userErr?.message })

    if (userErr) {
      console.error("[v0] Telemetry API: Auth error:", userErr)
      return NextResponse.json({ error: "Authentication failed: " + userErr.message }, { status: 401 })
    }

    if (!user) {
      console.log("[v0] Telemetry API: No user found, returning fallback data")
      return NextResponse.json({
        ok: true,
        metrics: {
          totalDocs: 0,
          thisMonth: 0,
          avgDurationMs: null,
        },
        recent: [],
      })
    }

    console.log("[v0] Telemetry API: Fetching total documents count")
    const { count: totalDocs, error: cErr } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })

    if (cErr) {
      console.error("[v0] Telemetry API: Documents count error:", cErr)
      // Continue with fallback instead of throwing
    }

    console.log("[v0] Telemetry API: Total docs count:", totalDocs)

    // This Month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    console.log("[v0] Telemetry API: Fetching this month's documents since:", startOfMonth)

    const { count: thisMonth, error: mErr } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth)

    if (mErr) {
      console.error("[v0] Telemetry API: This month count error:", mErr)
    }

    console.log("[v0] Telemetry API: This month count:", thisMonth)

    console.log("[v0] Telemetry API: Calculating average duration from telemetry table")
    let avgMs: number | null = null

    try {
      const { data: tData, error: tErr } = await supabase
        .from("telemetry")
        .select("duration_ms")
        .gte("created_at", startOfMonth)
        .not("duration_ms", "is", null)

      if (tErr) {
        console.error("[v0] Telemetry API: Telemetry query error:", tErr)
      } else if (tData?.length) {
        const validDurations = tData.map((r) => r.duration_ms).filter((n) => typeof n === "number" && n > 0)

        if (validDurations.length > 0) {
          avgMs = Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length)
        }
        console.log("[v0] Telemetry API: Calculated average duration:", avgMs, "from", validDurations.length, "records")
      }
    } catch (avgError) {
      console.error("[v0] Telemetry API: Error calculating average:", avgError)
    }

    // Recent Activity
    console.log("[v0] Telemetry API: Fetching recent documents")
    const { data: recent, error: rErr } = await supabase
      .from("documents")
      .select("id, doc_type, title, created_at")
      .order("created_at", { ascending: false })
      .limit(20)

    if (rErr) {
      console.error("[v0] Telemetry API: Recent documents error:", rErr)
    }

    console.log("[v0] Telemetry API: Recent documents count:", recent?.length || 0)

    const response = {
      ok: true,
      metrics: {
        totalDocs: totalDocs ?? 0,
        thisMonth: thisMonth ?? 0,
        avgDurationMs: avgMs,
      },
      recent: recent || [],
    }

    console.log("[v0] Telemetry API: Returning successful response:", response)
    return NextResponse.json(response)
  } catch (err: any) {
    console.error("[v0] Telemetry API: Unhandled error:", {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      cause: err?.cause,
    })

    const errorMessage = err?.message || "Unknown error occurred"
    return NextResponse.json(
      {
        error: `Telemetry fetch failed: ${errorMessage}`,
        details: process.env.NODE_ENV === "development" ? err?.stack : undefined,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getServerSupabase()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, tokensIn, tokensOut, durationMs, score, docId } = body

    const { data: telemetryRecord, error: insertError } = await supabase
      .from("telemetry")
      .insert({
        doc_type: type,
        user_id: user.id,
        tokens_in: tokensIn || 0,
        tokens_out: tokensOut || 0,
        duration_ms: durationMs || 0,
        score: score || 0,
        doc_id: docId,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Telemetry insert error:", insertError)
      return NextResponse.json({ error: "Failed to save telemetry data" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: telemetryRecord })
  } catch (error) {
    console.error("Telemetry POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
