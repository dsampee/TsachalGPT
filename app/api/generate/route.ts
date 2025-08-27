import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from "@/lib/supabase/server"
import { robustOpenAI, OpenAIError } from "@/lib/openai-client"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const getDocumentSchema = (documentType: string) => {
  const schemas = {
    proposal: {
      type: "object",
      properties: {
        executiveSummary: { type: "string", description: "2-3 paragraph executive summary" },
        problemStatement: { type: "string", description: "Clear problem identification and solution overview" },
        projectScope: { type: "string", description: "Detailed scope and deliverables" },
        timeline: { type: "string", description: "Project timeline and milestones" },
        budget: { type: "string", description: "Budget breakdown and investment details" },
        teamQualifications: { type: "string", description: "Team experience and qualifications" },
        riskAssessment: { type: "string", description: "Risk analysis and mitigation strategies" },
        termsConditions: { type: "string", description: "Terms and conditions" },
        callToAction: { type: "string", description: "Clear next steps and call to action" },
      },
      required: ["executiveSummary", "problemStatement", "projectScope", "timeline", "budget"],
    },
    audit: {
      type: "object",
      properties: {
        executiveSummary: { type: "string", description: "Summary of key audit findings" },
        auditScope: { type: "string", description: "Scope and methodology used" },
        keyFindings: { type: "array", items: { type: "string" }, description: "List of key findings and observations" },
        riskAssessment: { type: "string", description: "Risk impact analysis" },
        recommendations: { type: "array", items: { type: "string" }, description: "Actionable recommendations" },
        managementResponse: { type: "string", description: "Required management response section" },
        implementationTimeline: { type: "string", description: "Timeline for implementing recommendations" },
        followUpPlan: { type: "string", description: "Monitoring and follow-up procedures" },
      },
      required: ["executiveSummary", "auditScope", "keyFindings", "recommendations"],
    },
    report: {
      type: "object",
      properties: {
        executiveSummary: { type: "string", description: "High-level summary of report findings" },
        situationAnalysis: { type: "string", description: "Current situation and context analysis" },
        marketResearch: { type: "string", description: "Market and competitive analysis" },
        performanceReview: { type: "string", description: "Financial and operational performance review" },
        strategicRecommendations: {
          type: "array",
          items: { type: "string" },
          description: "Strategic recommendations",
        },
        implementationRoadmap: { type: "string", description: "Implementation plan and roadmap" },
        riskFactors: { type: "string", description: "Risk factors and mitigation strategies" },
        conclusion: { type: "string", description: "Conclusion and next steps" },
      },
      required: ["executiveSummary", "situationAnalysis", "strategicRecommendations", "conclusion"],
    },
    "hr-policy": {
      type: "object",
      properties: {
        policyStatement: { type: "string", description: "Clear policy statement and objectives" },
        scope: { type: "string", description: "Scope and applicability of the policy" },
        definitions: { type: "string", description: "Key terms and definitions" },
        procedures: { type: "string", description: "Detailed policy procedures and guidelines" },
        rolesResponsibilities: { type: "string", description: "Roles and responsibilities matrix" },
        compliance: { type: "string", description: "Compliance requirements and standards" },
        enforcement: { type: "string", description: "Enforcement and disciplinary actions" },
        reviewProcess: { type: "string", description: "Policy review and update process" },
      },
      required: ["policyStatement", "scope", "procedures", "rolesResponsibilities"],
    },
  }

  return schemas[documentType.toLowerCase()] || schemas.proposal
}

const getDocumentInstructions = (documentType: string) => {
  const baseInstructions = `You are TsachalGPT, a professional document generator. You must respond with structured JSON data that matches the provided schema exactly. Each field should contain well-formatted, professional content with proper markdown formatting where appropriate.`

  const typeSpecificInstructions = {
    proposal: `Generate a comprehensive business proposal with all required sections. Focus on clear value proposition, detailed scope, realistic timelines, and compelling call-to-action.`,
    audit: `Create a thorough audit report with objective findings, clear risk assessments, and actionable recommendations. Maintain professional audit standards throughout.`,
    report: `Develop a comprehensive business report with data-driven insights, strategic analysis, and practical recommendations for implementation.`,
    "hr-policy": `Create a detailed HR policy document that is legally compliant, clearly written, and practically implementable within an organization.`,
  }

  return `${baseInstructions} ${typeSpecificInstructions[documentType.toLowerCase()] || typeSpecificInstructions.proposal}`
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let tokensIn = 0
  let tokensOut = 0

  try {
    const { documentType, title, requirements, fileIds, visibility = "private" } = await request.json()

    if (!documentType || !title || !requirements) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let vectorStoreId: string | undefined
    if (fileIds && fileIds.length > 0) {
      try {
        const vectorStore = await robustOpenAI.createVectorStore(
          {
            name: `TsachalGPT-${Date.now()}`,
            expires_after: {
              anchor: "last_active_at",
              days: 1,
            },
          },
          user.id,
        )

        await robustOpenAI.createFileBatch(
          vectorStore.id,
          {
            file_ids: fileIds,
          },
          user.id,
        )

        vectorStoreId = vectorStore.id
      } catch (error) {
        console.error("Vector store creation error:", error)
      }
    }

    const userMessage = `Generate a professional ${documentType} with the following specifications:

**Title:** ${title}

**Requirements & Context:**
${requirements}

${fileIds && fileIds.length > 0 ? `**Reference Files:** ${fileIds.length} files have been uploaded for context and reference.` : ""}

Please create a comprehensive, well-structured document that follows industry standards and includes all required sections.`

    tokensIn = Math.ceil((getDocumentInstructions(documentType) + userMessage).length / 4)

    const completion = await robustOpenAI.chatCompletion(
      {
        model: "gpt-4o-2024-08-06",
        messages: [
          {
            role: "system",
            content: getDocumentInstructions(documentType),
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        tools: [{ type: "file_search" }],
        tool_resources: vectorStoreId
          ? {
              file_search: {
                vector_store_ids: [vectorStoreId],
              },
            }
          : undefined,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: `${documentType}_document`,
            schema: getDocumentSchema(documentType),
            strict: true,
          },
        },
        max_tokens: 4000,
      },
      fileIds || [],
      user.id,
    )

    const generatedContent = completion.choices[0]?.message?.content

    if (!generatedContent) {
      throw new Error("No content generated")
    }

    tokensOut = Math.ceil(generatedContent.length / 4)

    const documentData = JSON.parse(generatedContent)

    const wordCount = Object.values(documentData)
      .join(" ")
      .split(/\s+/)
      .filter((word) => word.length > 0).length

    const { data: savedDocument, error: saveError } = await supabase
      .from("documents")
      .insert({
        title,
        document_type: documentType,
        content: documentData,
        owner_id: user.id,
        file_ids: fileIds || [],
        vector_store_id: vectorStoreId,
        visibility,
        word_count: wordCount,
        status: "draft",
      })
      .select()
      .single()

    if (saveError) {
      console.error("Database save error:", saveError)
    }

    const durationMs = Date.now() - startTime
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: documentType,
          createdBy: user.id,
          tokensIn,
          tokensOut,
          durationMs,
          score: 0, // Will be updated after QA if available
          documentTitle: title,
        }),
      })
    } catch (telemetryError) {
      console.error("Failed to record telemetry:", telemetryError)
    }

    if (vectorStoreId) {
      try {
        await robustOpenAI.deleteVectorStore(vectorStoreId, user.id)
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError)
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: savedDocument?.id,
        title,
        type: documentType,
        data: documentData,
        generatedAt: new Date().toISOString(),
        hasReferences: fileIds && fileIds.length > 0,
        schema: getDocumentSchema(documentType),
        wordCount,
        visibility,
        owner: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name,
        },
      },
    })
  } catch (error) {
    console.error("Generation error:", error)

    const durationMs = Date.now() - startTime
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/telemetry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "error",
            createdBy: user.id,
            tokensIn,
            tokensOut: 0,
            durationMs,
            score: 0,
            documentTitle: "Failed Generation",
          }),
        })
      }
    } catch (telemetryError) {
      console.error("Failed to record error telemetry:", telemetryError)
    }

    if (error instanceof OpenAIError) {
      return NextResponse.json(
        {
          error: error.userMessage,
          retryable: error.isRetryable,
          retryCount: error.retryCount,
        },
        { status: error.status === 429 ? 429 : 500 },
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate document",
        retryable: true,
      },
      { status: 500 },
    )
  }
}
