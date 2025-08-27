export interface DocumentSection {
  title: string
  content: string
  subsections?: DocumentSection[]
}

export interface DocumentTemplate {
  type: string
  sections: string[]
  formatting: {
    useExecutiveSummary: boolean
    useTableOfContents: boolean
    useAppendices: boolean
  }
}

export const documentTemplates: Record<string, DocumentTemplate> = {
  proposal: {
    type: "Business Proposal",
    sections: [
      "Executive Summary",
      "Problem Statement",
      "Proposed Solution",
      "Project Scope & Deliverables",
      "Timeline & Milestones",
      "Budget & Investment",
      "Team & Qualifications",
      "Risk Assessment",
      "Terms & Conditions",
      "Next Steps",
    ],
    formatting: {
      useExecutiveSummary: true,
      useTableOfContents: true,
      useAppendices: true,
    },
  },
  bid: {
    type: "Competitive Bid",
    sections: [
      "Bid Summary",
      "Understanding of Requirements",
      "Technical Approach",
      "Resource Allocation",
      "Cost Breakdown",
      "Project Timeline",
      "Quality Assurance",
      "References & Experience",
      "Compliance & Certifications",
    ],
    formatting: {
      useExecutiveSummary: true,
      useTableOfContents: true,
      useAppendices: true,
    },
  },
  "audit report": {
    type: "Audit Report",
    sections: [
      "Executive Summary",
      "Audit Scope & Methodology",
      "Key Findings",
      "Risk Assessment",
      "Recommendations",
      "Management Response",
      "Implementation Timeline",
      "Follow-up Plan",
    ],
    formatting: {
      useExecutiveSummary: true,
      useTableOfContents: true,
      useAppendices: true,
    },
  },
  "business report": {
    type: "Business Report",
    sections: [
      "Executive Summary",
      "Current Situation Analysis",
      "Market Research",
      "Financial Performance",
      "Strategic Recommendations",
      "Implementation Roadmap",
      "Risk Factors",
      "Conclusion",
    ],
    formatting: {
      useExecutiveSummary: true,
      useTableOfContents: true,
      useAppendices: false,
    },
  },
  "hr policy": {
    type: "HR Policy Document",
    sections: [
      "Policy Statement",
      "Scope & Applicability",
      "Definitions",
      "Policy Procedures",
      "Roles & Responsibilities",
      "Compliance Requirements",
      "Enforcement",
      "Review Process",
    ],
    formatting: {
      useExecutiveSummary: false,
      useTableOfContents: true,
      useAppendices: true,
    },
  },
  "onboarding document": {
    type: "Employee Onboarding Guide",
    sections: [
      "Welcome Message",
      "Company Overview",
      "Role Information",
      "Organizational Structure",
      "Policies & Procedures",
      "Training Schedule",
      "First Week Checklist",
      "Support Resources",
    ],
    formatting: {
      useExecutiveSummary: false,
      useTableOfContents: true,
      useAppendices: true,
    },
  },
}

export function getDocumentTemplate(documentType: string): DocumentTemplate | null {
  return documentTemplates[documentType.toLowerCase()] || null
}

export function formatDocumentContent(content: string, template: DocumentTemplate): string {
  // Add table of contents if required
  if (template.formatting.useTableOfContents) {
    const sections = template.sections
    const toc = sections.map((section, index) => `${index + 1}. ${section}`).join("\n")

    return `# ${template.type}

## Table of Contents
${toc}

---

${content}`
  }

  return `# ${template.type}

${content}`
}
