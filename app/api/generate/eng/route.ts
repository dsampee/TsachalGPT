import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const engineeringSchema = {
  type: "object",
  properties: {
    projectInformation: {
      type: "object",
      properties: {
        projectName: { type: "string", description: "Name of the engineering project" },
        projectNumber: { type: "string", description: "Project reference number" },
        location: { type: "string", description: "Project location" },
        client: { type: "string", description: "Client name" },
        engineer: { type: "string", description: "Lead engineer name and credentials" },
      },
      required: ["projectName", "location", "client"],
    },
    scope: { type: "string", description: "Detailed scope of engineering work and objectives" },
    systemsAnalyzed: {
      type: "array",
      items: { type: "string" },
      description: "List of electrical/engineering systems analyzed",
    },
    testsConducted: {
      type: "array",
      items: {
        type: "object",
        properties: {
          testName: { type: "string", description: "Name of the test performed" },
          testStandard: { type: "string", description: "Standard or procedure followed" },
          equipment: { type: "string", description: "Equipment used for testing" },
          methodology: { type: "string", description: "Test methodology and procedure" },
          datePerformed: { type: "string", description: "Date test was performed" },
        },
        required: ["testName", "methodology"],
      },
      description: "Detailed list of tests conducted",
    },
    resultsObtained: {
      type: "array",
      items: {
        type: "object",
        properties: {
          testReference: { type: "string", description: "Reference to related test" },
          parameter: { type: "string", description: "Parameter measured" },
          result: { type: "string", description: "Test result value" },
          acceptanceCriteria: { type: "string", description: "Acceptance criteria or standard" },
          status: { type: "string", enum: ["Pass", "Fail", "Marginal", "N/A"], description: "Pass/fail status" },
          notes: { type: "string", description: "Additional notes or observations" },
        },
        required: ["parameter", "result", "status"],
      },
      description: "Test results and measurements obtained",
    },
    defectsIdentified: {
      type: "array",
      items: {
        type: "object",
        properties: {
          defectId: { type: "string", description: "Unique defect identifier" },
          system: { type: "string", description: "Affected system or component" },
          description: { type: "string", description: "Detailed defect description" },
          severity: { type: "string", enum: ["Critical", "Major", "Minor", "Cosmetic"], description: "Severity level" },
          safetyImpact: { type: "string", description: "Safety impact assessment" },
          location: { type: "string", description: "Physical location of defect" },
        },
        required: ["defectId", "system", "description", "severity"],
      },
      description: "Defects and issues identified during inspection",
    },
    actionsTaken: {
      type: "array",
      items: {
        type: "object",
        properties: {
          actionId: { type: "string", description: "Action reference number" },
          relatedDefect: { type: "string", description: "Related defect ID if applicable" },
          actionDescription: { type: "string", description: "Description of action taken" },
          completionDate: { type: "string", description: "Date action was completed" },
          performedBy: { type: "string", description: "Person who performed the action" },
          verification: { type: "string", description: "Verification method used" },
        },
        required: ["actionId", "actionDescription"],
      },
      description: "Corrective actions taken and remedial work performed",
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          priority: { type: "string", enum: ["Immediate", "High", "Medium", "Low"], description: "Priority level" },
          recommendation: { type: "string", description: "Detailed recommendation" },
          justification: { type: "string", description: "Technical justification" },
          estimatedCost: { type: "string", description: "Estimated implementation cost" },
          timeframe: { type: "string", description: "Recommended timeframe" },
        },
        required: ["priority", "recommendation"],
      },
      description: "Engineering recommendations for improvements",
    },
    conclusion: { type: "string", description: "Overall conclusion and system assessment" },
    certificationStatus: { type: "string", description: "Certification or compliance status" },
  },
  required: [
    "projectInformation",
    "scope",
    "testsConducted",
    "resultsObtained",
    "defectsIdentified",
    "actionsTaken",
    "conclusion",
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
          name: `Engineering-Report-${Date.now()}`,
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
          content: `You are TsachalGPT, a professional engineering report generator. Generate comprehensive engineering and electrical reports following industry standards. Include detailed test procedures, accurate results, systematic defect identification, and practical recommendations. Ensure technical accuracy and compliance with relevant engineering codes and standards.`,
        },
        {
          role: "user",
          content: `Generate a professional engineering/electrical report with the following specifications:

**Title:** ${title}

**Requirements & Context:**
${requirements}

${fileIds?.length ? `**Reference Files:** ${fileIds.length} files uploaded for context.` : ""}

Create a comprehensive engineering report with scope, tests, results, defects, and actions taken.`,
        },
      ],
      tools: [{ type: "file_search" }],
      tool_resources: vectorStoreId ? { file_search: { vector_store_ids: [vectorStoreId] } } : undefined,
      response_format: {
        type: "json_schema",
        json_schema: { name: "engineering_report_document", schema: engineeringSchema, strict: true },
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
        type: "engineering",
        data: documentData,
        generatedAt: new Date().toISOString(),
        hasReferences: fileIds && fileIds.length > 0,
        schema: engineeringSchema,
      },
    })
  } catch (error) {
    console.error("Engineering report generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate engineering report" },
      { status: 500 },
    )
  }
}
