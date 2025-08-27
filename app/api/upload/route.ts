import OpenAI from "openai"
import { NextResponse } from "next/server"
import { toFile } from "openai/uploads" // converts Blob/ArrayBuffer to proper file for SDK

export const runtime = "nodejs" // IMPORTANT: file uploads need Node runtime (not edge)
export const maxDuration = 60 // optional: allow longer upload work

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
])

const MAX_SIZE_MB = 50

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const files = form.getAll("files") // expect <input name="files" multiple>

    if (!files?.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    const uploaded: { name: string; file_id: string }[] = []

    for (const f of files) {
      if (!(f instanceof File)) {
        return NextResponse.json({ error: "Invalid file payload" }, { status: 400 })
      }

      const sizeMb = f.size / (1024 * 1024)
      if (sizeMb > MAX_SIZE_MB) {
        return NextResponse.json({ error: `File too large: ${f.name}` }, { status: 413 })
      }

      if (f.type && !ALLOWED_TYPES.has(f.type)) {
        // Some browsers send empty type for .doc/.docx—don't hard fail on empty
        if (f.type !== "") {
          return NextResponse.json({ error: `Unsupported type: ${f.type}` }, { status: 415 })
        }
      }

      // Convert to an SDK-friendly file object
      const sdkFile = await toFile(f, f.name)

      const result = await openai.files.create({
        file: sdkFile,
        purpose: "assistants", // enables File Search / retrieval
      })

      uploaded.push({ name: f.name, file_id: result.id })
    }

    return NextResponse.json({ ok: true, files: uploaded })
  } catch (err: any) {
    console.error("[upload] error", err)
    return NextResponse.json({ error: err?.message ?? "Upload failed" }, { status: 500 })
  }
}
