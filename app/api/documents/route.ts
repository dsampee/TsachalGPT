import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentType = searchParams.get("type")
    const status = searchParams.get("status")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let query = supabase
      .from("documents")
      .select(`
        id,
        title,
        document_type,
        status,
        visibility,
        word_count,
        qa_score,
        created_at,
        updated_at,
        profiles!owner_id (
          full_name,
          email,
          organization
        )
      `)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (documentType) {
      query = query.eq("document_type", documentType)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data: documents, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
      pagination: {
        limit,
        offset,
        hasMore: documents?.length === limit,
      },
    })
  } catch (error) {
    console.error("Documents fetch error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch documents",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("id")

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 })
    }

    const { error } = await supabase.from("documents").delete().eq("id", documentId).eq("owner_id", user.id) // Ensure user can only delete their own documents

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Document delete error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete document",
      },
      { status: 500 },
    )
  }
}
