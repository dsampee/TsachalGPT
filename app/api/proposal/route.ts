import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const getDocumentInstructions = (documentType: string) => {
  const baseInstructions = `You are TsachalGPT, a professional document generator specializing in creating high-quality business documents. Always maintain a professional tone and follow industry best practices.`

  const typeSpecificInstructions = {
    proposal: `Create comprehensive business proposals that include:
- Executive Summary (2-3 paragraphs)
- Problem Statement & Solution Overview
- Detailed Project Scope & Deliverables
- Timeline & Milestones
- Budget & Investment Details
- Team Qualifications & Experience
- Risk Assessment & Mitigation
- Terms & Conditions
- Call to Action`,

    bid: `Generate competitive bid documents that include:
- Bid Summary & Key Differentiators
- Understanding of Requirements
- Technical Approach & Methodology
- Resource Allocation & Team Structure
- Detailed Cost Breakdown
- Timeline & Project Schedule
- Quality Assurance Measures
- References & Past Performance
- Compliance & Certifications`,

    "audit report": `Create thorough audit reports that include:
- Executive Summary of Findings
- Audit Scope & Methodology
- Key Findings & Observations
- Risk Assessment & Impact Analysis
- Recommendations & Action Items
- Management Response Requirements
- Implementation Timeline
- Follow-up & Monitoring Plan`,

    "business report": `Generate comprehensive business reports that include:
- Executive Summary
- Current Situation Analysis
- Market Research & Competitive Analysis
- Financial Performance Review
- Strategic Recommendations
- Implementation Roadmap
- Risk Factors & Mitigation
- Conclusion & Next Steps`,

    "hr policy": `Create detailed HR policy documents that include:
- Policy Statement & Objectives
- Scope & Applicability
- Definitions & Key Terms
- Detailed Policy Procedures
- Roles & Responsibilities
- Compliance Requirements
- Enforcement & Disciplinary Actions
- Review & Update Process`,

    "onboarding document": `Generate comprehensive onboarding materials that include:
- Welcome Message & Company Overview
- Role-Specific Information & Expectations
- Organizational Structure & Key Contacts
- Policies & Procedures Overview
- Training Schedule & Resources
- First Week/Month Checklist
- Performance Expectations
- Support Resources & FAQ`,
  }

  return `${baseInstructions}

${typeSpecificInstructions[documentType.toLowerCase()] || typeSpecificInstructions.proposal}

IMPORTANT: Structure your response as a well-formatted document with clear headings, bullet points, and professional formatting. Use markdown formatting for better readability.`
}

export async function POST(request: NextRequest) {
  try {
    const { documentType, title, requirements, fileIds } = await request.json()

    if (!documentType || !title || !requirements) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create vector store for file search if files are provided
    let vectorStoreId: string | undefined
    if (fileIds && fileIds.length > 0) {
      try {
        const vectorStore = await openai.beta.vectorStores.create({
          name: `TsachalGPT-${Date.now()}`,
          expires_after: {
            anchor: "last_active_at",
            days: 1,
          },
        })

        // Add files to vector store
        await openai.beta.vectorStores.fileBatches.create(vectorStore.id, {
          file_ids: fileIds,
        })

        vectorStoreId = vectorStore.id
      } catch (error) {
        console.error("Vector store creation error:", error)
        // Continue without file search if vector store creation fails
      }
    }

    // Create assistant with enhanced instructions
    const assistant = await openai.beta.assistants.create({
      name: "TsachalGPT Document Generator",
      instructions: getDocumentInstructions(documentType),
      model: "gpt-4-turbo-preview",
      tools: vectorStoreId ? [{ type: "file_search" }] : [],
      tool_resources: vectorStoreId
        ? {
            file_search: {
              vector_store_ids: [vectorStoreId],
            },
          }
        : undefined,
    })

    // Create thread with enhanced prompt
    const enhancedPrompt = `Generate a professional ${documentType} with the following specifications:

**Title:** ${title}

**Requirements & Context:**
${requirements}

${fileIds && fileIds.length > 0 ? `**Reference Files:** ${fileIds.length} files have been uploaded for context and reference.` : ""}

Please create a comprehensive, well-structured document that follows industry standards and best practices. Use clear headings, professional language, and ensure all sections are thoroughly developed.`

    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: enhancedPrompt,
        },
      ],
    })

    // Create and poll run
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      max_completion_tokens: 4000,
    })

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    let attempts = 0
    const maxAttempts = 60 // 60 seconds timeout

    while ((runStatus.status === "in_progress" || runStatus.status === "queued") && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
      attempts++
    }

    if (runStatus.status === "completed") {
      const messages = await openai.beta.threads.messages.list(thread.id)
      const lastMessage = messages.data[0]

      if (lastMessage.content[0].type === "text") {
        const content = lastMessage.content[0].text.value

        // Clean up resources
        try {
          await openai.beta.assistants.del(assistant.id)
          if (vectorStoreId) {
            await openai.beta.vectorStores.del(vectorStoreId)
          }
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError)
        }

        return NextResponse.json({
          success: true,
          document: {
            title,
            type: documentType,
            content,
            generatedAt: new Date().toISOString(),
            wordCount: content.split(/\s+/).length,
            hasReferences: fileIds && fileIds.length > 0,
          },
        })
      }
    }

    // Handle timeout or failure
    try {
      await openai.beta.assistants.del(assistant.id)
      if (vectorStoreId) {
        await openai.beta.vectorStores.del(vectorStoreId)
      }
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError)
    }

    return NextResponse.json(
      {
        error:
          runStatus.status === "failed"
            ? "Document generation failed"
            : "Document generation timed out. Please try again.",
      },
      { status: 500 },
    )
  } catch (error) {
    console.error("Generation error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate document",
      },
      { status: 500 },
    )
  }
}
