import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// QA Checklists for different document types
const QA_CHECKLISTS = {
  proposal: [
    { id: "executive_summary", question: "Does the document include a clear executive summary?", weight: 15 },
    { id: "problem_statement", question: "Is the problem/opportunity clearly defined?", weight: 20 },
    { id: "solution_approach", question: "Is the proposed solution well-articulated and feasible?", weight: 25 },
    { id: "timeline", question: "Are project timelines realistic and well-defined?", weight: 15 },
    { id: "budget", question: "Is the budget breakdown clear and justified?", weight: 15 },
    { id: "team_qualifications", question: "Are team qualifications and experience clearly presented?", weight: 10 },
  ],
  audit: [
    { id: "scope_definition", question: "Is the audit scope clearly defined and comprehensive?", weight: 20 },
    { id: "findings_clarity", question: "Are findings clearly documented with evidence?", weight: 25 },
    { id: "clause_mapping", question: "Are findings properly mapped to relevant ISO clauses?", weight: 20 },
    { id: "severity_assessment", question: "Is severity assessment consistent and justified?", weight: 15 },
    { id: "capa_actionable", question: "Are CAPA items specific, actionable, and time-bound?", weight: 20 },
  ],
  marine: [
    { id: "vessel_details", question: "Are vessel details complete and accurate?", weight: 15 },
    { id: "survey_scope", question: "Is the survey scope comprehensive and well-defined?", weight: 20 },
    { id: "inspection_methodology", question: "Is the inspection methodology clearly described?", weight: 15 },
    { id: "findings_documentation", question: "Are all findings properly documented with evidence?", weight: 25 },
    { id: "recommendations", question: "Are recommendations prioritized and actionable?", weight: 25 },
  ],
  engineering: [
    { id: "scope_clarity", question: "Is the scope of work clearly defined?", weight: 20 },
    { id: "test_methodology", question: "Are test methods and procedures well-documented?", weight: 20 },
    { id: "results_accuracy", question: "Are test results accurately recorded and analyzed?", weight: 25 },
    { id: "defect_classification", question: "Are defects properly classified and prioritized?", weight: 20 },
    { id: "corrective_actions", question: "Are corrective actions specific and implementable?", weight: 15 },
  ],
}

export async function POST(request: NextRequest) {
  try {
    const { draftJson, fileIds, documentType } = await request.json()

    if (!draftJson || !documentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const checklist = QA_CHECKLISTS[documentType.toLowerCase() as keyof typeof QA_CHECKLISTS] || QA_CHECKLISTS.proposal

    // Create QA prompt
    const qaPrompt = `
You are a professional document quality assurance reviewer. Analyze the following document draft and provide a comprehensive QA assessment.

Document Type: ${documentType}
Document Content: ${JSON.stringify(draftJson, null, 2)}

Quality Checklist:
${checklist.map((item) => `- ${item.question} (Weight: ${item.weight}%)`).join("\n")}

For each checklist item, evaluate:
1. Pass/Fail status
2. Specific gaps or issues identified
3. Suggested improvements

Additionally, provide:
- Overall quality score (0-100)
- Critical gaps that must be addressed
- Optional: A revised/improved version of the document if significant issues are found

Respond with a structured JSON format:
{
  "score": number (0-100),
  "overallAssessment": "string",
  "checklistResults": [
    {
      "id": "string",
      "question": "string",
      "status": "pass" | "fail" | "partial",
      "score": number,
      "feedback": "string",
      "suggestions": ["string"]
    }
  ],
  "gaps": ["string array of critical issues"],
  "recommendations": ["string array of improvement suggestions"],
  "fixed": null | object (improved version if needed)
}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a professional document QA reviewer. Provide thorough, constructive feedback in the exact JSON format requested.",
        },
        {
          role: "user",
          content: qaPrompt,
        },
      ],
      tools: fileIds?.length > 0 ? [{ type: "file_search" }] : undefined,
      response_format: { type: "json_object" },
      temperature: 0.3,
    })

    const qaResult = JSON.parse(completion.choices[0].message.content || "{}")

    return NextResponse.json({
      success: true,
      qa: qaResult,
      usage: completion.usage,
    })
  } catch (error) {
    console.error("QA processing error:", error)
    return NextResponse.json({ error: "Failed to process QA review" }, { status: 500 })
  }
}
