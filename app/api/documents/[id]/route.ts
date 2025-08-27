import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: document, error } = await supabase
      .from("documents")
      .select(`
        *,
        profiles!owner_id (
          full_name,
          email,
          organization
        )
      `)
      .eq("id", params.id)
      .single()

    if (error) {
      throw error
    }

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      document,
    })
  } catch (error) {
    console.error("Document fetch error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch document",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updates = await request.json()

    const { data: document, error } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", params.id)
      .eq("owner_id", user.id) // Ensure user can only update their own documents
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      document,
    })
  } catch (error) {
    console.error("Document update error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update document",
      },
      { status: 500 },
    )
  }
}
