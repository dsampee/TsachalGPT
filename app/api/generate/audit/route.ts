import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const auditSchema = {
  type: "object",
  properties: {
    executiveSummary: { type: "string", description: "Executive summary of audit findings and overall assessment" },
    auditScope: { type: "string", description: "Scope of audit including standards covered (ISO 9001/14001/45001)" },
    auditMethodology: { type: "string", description: "Methodology and approach used during the audit" },
    findingsByClause: {
      type: "array",
      items: {
        type: "object",
        properties: {
          clauseNumber: { type: "string", description: "ISO clause number (e.g., 4.1, 7.2)" },
          clauseTitle: { type: "string", description: "Title of the clause" },
          finding: { type: "string", description: "Detailed finding description" },
          severity: { type: "string", enum: ["Major", "Minor", "Observation"], description: "Severity level" },
          evidence: { type: "string", description: "Evidence supporting the finding" },
        },
        required: ["clauseNumber", "clauseTitle", "finding", "severity"],
      },
      description: "Findings organized by ISO clause",
    },
    capaList: {
      type: "array",
      items: {
        type: "object",
        properties: {
          capaId: { type: "string", description: "Unique CAPA identifier" },
          relatedFinding: { type: "string", description: "Related finding or clause" },
          correctiveAction: { type: "string", description: "Immediate corrective action required" },
          preventiveAction: { type: "string", description: "Preventive action to avoid recurrence" },
          responsiblePerson: { type: "string", description: "Person responsible for implementation" },
          targetDate: { type: "string", description: "Target completion date" },
          status: { type: "string", enum: ["Open", "In Progress", "Closed"], description: "Current status" },
        },
        required: ["capaId", "correctiveAction", "responsiblePerson", "targetDate"],
      },
      description: "Corrective and Preventive Action list",
    },
    overallAssessment: { type: "string", description: "Overall assessment and certification recommendation" },
    nextAuditDate: { type: "string", description: "Recommended next audit date" },
  },
  required: ["executiveSummary", "auditScope", "findingsByClause", "capaList", "overallAssessment"],
}

export async function POST(request: NextRequest) {
  try {
    const { title, requirements, fileIds } = await request.json()

    if (!title || !requirements) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    let vectorStoreId: string | undefined
    if (fileIds && fileIds.length > 0) {
      try {
        const vectorStore = await openai.beta.vectorStores.create({
          name: `Audit-${Date.now()}`,
          expires_after: { anchor: "last_active_at", days: 1 },
        })
        await openai.beta.vectorStores.fileBatches.create(vectorStore.id, { file_ids: fileIds })
        vectorStoreId = vectorStore.id
      } catch (error) {
        console.error("Vector store creation error:", error)
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: `You are TsachalGPT, a professional ISO audit document generator. Generate comprehensive audit reports following ISO 9001/14001/45001 standards. Organize findings by clause number, assign appropriate severity levels, and create actionable CAPA items. Ensure all findings are evidence-based and recommendations are practical.`,
        },
        {
          role: "user",
          content: `Generate a professional ISO audit report with the following specifications:

**Title:** ${title}

**Requirements & Context:**
${requirements}

${fileIds?.length ? `**Reference Files:** ${fileIds.length} files uploaded for context.` : ""}

Create a comprehensive audit report with findings categorized by ISO clause and a detailed CAPA list.`,
        },
      ],
      tools: [{ type: "file_search" }],
      tool_resources: vectorStoreId ? { file_search: { vector_store_ids: [vectorStoreId] } } : undefined,
      response_format: {
        type: "json_schema",
        json_schema: { name: "audit_document", schema: auditSchema, strict: true },
      },
      max_tokens: 4000,
    })

    const generatedContent = completion.choices[0]?.message?.content
    if (!generatedContent) throw new Error("No content generated")

    const documentData = JSON.parse(generatedContent)

    if (vectorStoreId) {
      try {
        await openai.beta.vectorStores.del(vectorStoreId)
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError)
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        title,
        type: "audit",
        data: documentData,
        generatedAt: new Date().toISOString(),
        hasReferences: fileIds && fileIds.length > 0,
        schema: auditSchema,
      },
    })
  } catch (error) {
    console.error("Audit generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate audit document" },
      { status: 500 },
    )
  }
}
