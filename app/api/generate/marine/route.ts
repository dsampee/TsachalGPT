import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const marineSchema = {
  type: "object",
  properties: {
    vesselInformation: {
      type: "object",
      properties: {
        vesselName: { type: "string", description: "Name of the vessel" },
        imoNumber: { type: "string", description: "IMO number" },
        vesselType: { type: "string", description: "Type of vessel" },
        flag: { type: "string", description: "Flag state" },
        yearBuilt: { type: "string", description: "Year of construction" },
        grossTonnage: { type: "string", description: "Gross tonnage" },
      },
      required: ["vesselName", "vesselType"],
    },
    surveyScope: { type: "string", description: "Scope and purpose of the marine survey" },
    surveyDate: { type: "string", description: "Date of survey" },
    surveyorDetails: { type: "string", description: "Surveyor name and credentials" },
    checksPerformed: {
      type: "array",
      items: {
        type: "object",
        properties: {
          system: { type: "string", description: "System or area checked (e.g., Hull, Engine, Safety Equipment)" },
          checkDescription: { type: "string", description: "Description of checks performed" },
          condition: {
            type: "string",
            enum: ["Excellent", "Good", "Fair", "Poor", "Critical"],
            description: "Condition assessment",
          },
          notes: { type: "string", description: "Additional notes or observations" },
        },
        required: ["system", "checkDescription", "condition"],
      },
      description: "Detailed checks performed during survey",
    },
    observations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          location: { type: "string", description: "Location of observation" },
          description: { type: "string", description: "Detailed observation description" },
          severity: {
            type: "string",
            enum: ["Critical", "Major", "Minor", "Informational"],
            description: "Severity level",
          },
          photosAvailable: { type: "boolean", description: "Whether photos are available" },
        },
        required: ["location", "description", "severity"],
      },
      description: "Key observations and findings",
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          priority: { type: "string", enum: ["Immediate", "High", "Medium", "Low"], description: "Priority level" },
          recommendation: { type: "string", description: "Detailed recommendation" },
          estimatedCost: { type: "string", description: "Estimated cost if applicable" },
          timeframe: { type: "string", description: "Recommended timeframe for action" },
        },
        required: ["priority", "recommendation"],
      },
      description: "Recommendations for vessel maintenance and compliance",
    },
    overallAssessment: { type: "string", description: "Overall vessel condition assessment" },
    certificationStatus: { type: "string", description: "Current certification status and validity" },
  },
  required: [
    "vesselInformation",
    "surveyScope",
    "checksPerformed",
    "observations",
    "recommendations",
    "overallAssessment",
  ],
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
          name: `Marine-Survey-${Date.now()}`,
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
          content: `You are TsachalGPT, a professional marine surveyor document generator. Generate comprehensive vessel survey reports following maritime industry standards. Include detailed vessel information, systematic checks, observations with severity assessments, and prioritized recommendations. Ensure compliance with international maritime regulations.`,
        },
        {
          role: "user",
          content: `Generate a professional marine survey report with the following specifications:

**Title:** ${title}

**Requirements & Context:**
${requirements}

${fileIds?.length ? `**Reference Files:** ${fileIds.length} files uploaded for context.` : ""}

Create a comprehensive vessel survey report with detailed checks, observations, and recommendations.`,
        },
      ],
      tools: [{ type: "file_search" }],
      tool_resources: vectorStoreId ? { file_search: { vector_store_ids: [vectorStoreId] } } : undefined,
      response_format: {
        type: "json_schema",
        json_schema: { name: "marine_survey_document", schema: marineSchema, strict: true },
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
        type: "marine",
        data: documentData,
        generatedAt: new Date().toISOString(),
        hasReferences: fileIds && fileIds.length > 0,
        schema: marineSchema,
      },
    })
  } catch (error) {
    console.error("Marine survey generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate marine survey document" },
      { status: 500 },
    )
  }
}
