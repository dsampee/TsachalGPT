"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FileUpload } from "@/components/file-upload"
import {
  FileText,
  Download,
  Eye,
  Loader2,
  Upload,
  Clock,
  FileCheck,
  Globe,
  Lock,
  Users,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { getDocumentTemplate } from "@/lib/document-templates"
import { QAResults } from "@/components/qa-results"

const documentTypes = ["Proposal", "Bid", "Audit Report", "Business Report", "HR Policy", "Onboarding Document"]

interface GeneratedDocument {
  id?: string
  title: string
  type: string
  data: any // Structured JSON data based on document type
  generatedAt: string
  hasReferences?: boolean
  schema?: any // JSON schema used for generation
  citations?: Array<{ source: string; page: string | number }>
  tables?: Array<{ title: string; rows: any[][] }>
  metadata?: {
    wordCount: number
    sections: string[]
    generationTime: number
  }
  qaResult?: any
  visibility?: string
  owner?: {
    id: string
    email: string
    name: string
  }
}

interface ErrorState {
  message: string
  retryable: boolean
  retryCount?: number
  isRateLimit?: boolean
}

export function DocumentGenerator() {
  const { user } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState<"pdf" | "docx" | null>(null)
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null)
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([])
  const [formData, setFormData] = useState({
    documentType: "",
    title: "",
    requirements: "",
    visibility: "private" as "private" | "organization" | "public",
  })
  const [generationError, setGenerationError] = useState<ErrorState | null>(null)
  const [exportError, setExportError] = useState<ErrorState | null>(null)
  const [isRunningQA, setIsRunningQA] = useState(false)
  const [isApplyingFixes, setIsApplyingFixes] = useState(false)
  const [qaResult, setQaResult] = useState<any>(null)

  const saveDocumentTelemetry = async (
    document: GeneratedDocument,
    tokensIn: number,
    tokensOut: number,
    durationMs: number,
  ) => {
    try {
      const response = await fetch("/api/telemetry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: document.type,
          createdBy: user?.id,
          tokensIn,
          tokensOut,
          durationMs,
          score: document.qaResult?.score || 0,
          documentTitle: document.title,
          docId: document.id,
        }),
      })

      if (!response.ok) {
        console.error("Failed to save telemetry:", await response.text())
      }
    } catch (error) {
      console.error("Telemetry save error:", error)
    }
  }

  const handleGenerate = async () => {
    if (!formData.documentType || !formData.title || !formData.requirements) {
      return
    }

    setIsGenerating(true)
    setGenerationError(null)
    setQaResult(null)

    const startTime = Date.now()

    try {
      console.log("[v0] Starting document generation...")

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentType: formData.documentType,
          title: formData.title,
          requirements: formData.requirements,
          fileIds: uploadedFileIds,
          visibility: formData.visibility,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw {
          message: result.error || "Failed to generate document",
          retryable: result.retryable !== false,
          retryCount: result.retryCount || 0,
          isRateLimit: response.status === 429,
        }
      }

      if (result.success) {
        console.log("[v0] Document generation successful")
        const document = result.document
        setGeneratedDocument(document)

        const durationMs = Date.now() - startTime
        const tokensIn = Math.ceil((formData.requirements + formData.title).length / 4)
        const tokensOut = document.metadata?.wordCount ? Math.ceil(document.metadata.wordCount / 4) : 0

        // Save telemetry data after successful generation
        await saveDocumentTelemetry(document, tokensIn, tokensOut, durationMs)

        await runQualityAssurance(document)
      } else {
        throw {
          message: result.error || "Failed to generate document",
          retryable: true,
          retryCount: 0,
        }
      }
    } catch (error: any) {
      console.error("[v0] Generation error:", error)

      if (error.message && error.retryable !== undefined) {
        setGenerationError(error)
      } else {
        setGenerationError({
          message: error instanceof Error ? error.message : "Failed to generate document",
          retryable: true,
          retryCount: 0,
        })
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRetryGeneration = async () => {
    console.log("[v0] Retrying document generation...")
    await handleGenerate()
  }

  const runQualityAssurance = async (document: GeneratedDocument) => {
    setIsRunningQA(true)

    try {
      const response = await fetch("/api/qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftJson: document.data,
          fileIds: uploadedFileIds,
          documentType: document.type,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to run quality assurance")
      }

      const result = await response.json()

      if (result.success) {
        setQaResult(result.qa)
        setGeneratedDocument((prev) => (prev ? { ...prev, qaResult: result.qa } : null))

        if (document.id && result.qa?.score) {
          await saveDocumentTelemetry(
            { ...document, qaResult: result.qa },
            0,
            0,
            0, // Only updating score, not recalculating tokens/duration
          )
        }
      }
    } catch (error) {
      console.error("QA error:", error)
    } finally {
      setIsRunningQA(false)
    }
  }

  const handleApplyFixes = async () => {
    if (!qaResult?.fixed || !generatedDocument) return

    setIsApplyingFixes(true)

    try {
      const updatedDocument = {
        ...generatedDocument,
        data: qaResult.fixed,
        generatedAt: new Date().toISOString(),
      }

      setGeneratedDocument(updatedDocument)

      await runQualityAssurance(updatedDocument)
    } catch (error) {
      console.error("Apply fixes error:", error)
    } finally {
      setIsApplyingFixes(false)
    }
  }

  const handleExport = async (format: "pdf" | "docx") => {
    if (!generatedDocument) return

    setIsExporting(format)
    setExportError(null)

    try {
      console.log(`[v0] Starting ${format.toUpperCase()} export...`)

      const exportPayload = {
        title: generatedDocument.title,
        content: formatStructuredDataForExport(generatedDocument.data, generatedDocument.type),
        type: generatedDocument.type,
        generatedAt: generatedDocument.generatedAt,
        jsonData: {
          ...generatedDocument.data,
          citations: generatedDocument.citations || [],
          tables: generatedDocument.tables || [],
          metadata: generatedDocument.metadata || {},
        },
      }

      const response = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exportPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw {
          message: errorData.error || `Failed to export ${format.toUpperCase()}`,
          retryable: errorData.retryable !== false,
          retryCount: errorData.retryCount || 0,
          isRateLimit: response.status === 429,
        }
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${generatedDocument.title.replace(/[^a-zA-Z0-9]/g, "_")}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log(`[v0] ${format.toUpperCase()} export completed successfully`)
    } catch (error: any) {
      console.error(`[v0] Export error:`, error)

      if (error.message && error.retryable !== undefined) {
        setExportError(error)
      } else {
        setExportError({
          message: error instanceof Error ? error.message : `Failed to export ${format.toUpperCase()}`,
          retryable: true,
          retryCount: 0,
        })
      }
    } finally {
      setIsExporting(null)
    }
  }

  const handleRetryExport = async (format: "pdf" | "docx") => {
    console.log(`[v0] Retrying ${format.toUpperCase()} export...`)
    await handleExport(format)
  }

  const formatStructuredDataForExport = (data: any, documentType: string): string => {
    if (!data) return ""

    let formatted = ""

    if (documentType.toLowerCase().includes("audit")) {
      if (data.executiveSummary) {
        formatted += `# Executive Summary\n\n${data.executiveSummary}\n\n`
      }
      if (data.auditScope) {
        formatted += `# Audit Scope\n\n${data.auditScope}\n\n`
      }
      if (data.findings && Array.isArray(data.findings)) {
        formatted += `# Findings\n\n`
        data.findings.forEach((finding: any, index: number) => {
          formatted += `## Finding ${index + 1}: ${finding.clause || "General"}\n\n`
          formatted += `**Description:** ${finding.description}\n\n`
          formatted += `**Severity:** ${finding.severity}\n\n`
          if (finding.evidence) {
            formatted += `**Evidence:** ${finding.evidence}\n\n`
          }
        })
      }
      if (data.capaList && Array.isArray(data.capaList)) {
        formatted += `# Corrective and Preventive Actions (CAPA)\n\n`
        data.capaList.forEach((capa: any, index: number) => {
          formatted += `## CAPA ${index + 1}\n\n`
          formatted += `**Action:** ${capa.action}\n\n`
          formatted += `**Responsible:** ${capa.responsible}\n\n`
          formatted += `**Due Date:** ${capa.dueDate}\n\n`
          formatted += `**Priority:** ${capa.priority}\n\n`
        })
      }
    } else if (documentType.toLowerCase().includes("marine")) {
      if (data.vesselDetails) {
        formatted += `# Vessel Details\n\n${JSON.stringify(data.vesselDetails, null, 2)}\n\n`
      }
      if (data.surveyChecks && Array.isArray(data.surveyChecks)) {
        formatted += `# Survey Checks\n\n`
        data.surveyChecks.forEach((check: any, index: number) => {
          formatted += `## ${check.category || `Check ${index + 1}`}\n\n`
          formatted += `**Status:** ${check.status}\n\n`
          formatted += `**Details:** ${check.details}\n\n`
        })
      }
      if (data.recommendations && Array.isArray(data.recommendations)) {
        formatted += `# Recommendations\n\n`
        data.recommendations.forEach((rec: any, index: number) => {
          formatted += `${index + 1}. **${rec.priority}:** ${rec.description}\n`
        })
        formatted += `\n`
      }
    } else if (documentType.toLowerCase().includes("eng")) {
      if (data.scope) {
        formatted += `# Scope of Work\n\n${data.scope}\n\n`
      }
      if (data.testsPerformed && Array.isArray(data.testsPerformed)) {
        formatted += `# Tests Performed\n\n`
        data.testsPerformed.forEach((test: any, index: number) => {
          formatted += `## ${test.testName || `Test ${index + 1}`}\n\n`
          formatted += `**Method:** ${test.method}\n\n`
          formatted += `**Results:** ${test.results}\n\n`
        })
      }
      if (data.defectsIdentified && Array.isArray(data.defectsIdentified)) {
        formatted += `# Defects Identified\n\n`
        data.defectsIdentified.forEach((defect: any, index: number) => {
          formatted += `${index + 1}. **${defect.severity}:** ${defect.description}\n`
        })
        formatted += `\n`
      }
      if (data.actionsTaken && Array.isArray(data.actionsTaken)) {
        formatted += `# Actions Taken\n\n`
        data.actionsTaken.forEach((action: any, index: number) => {
          formatted += `${index + 1}. ${action}\n`
        })
        formatted += `\n`
      }
    } else {
      Object.entries(data).forEach(([key, value]) => {
        const title = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())

        formatted += `## ${title}\n\n`

        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === "object") {
              formatted += `### ${index + 1}. ${item.title || item.name || `Item ${index + 1}`}\n\n`
              Object.entries(item).forEach(([subKey, subValue]) => {
                if (subKey !== "title" && subKey !== "name") {
                  formatted += `**${subKey.replace(/([A-Z])/g, " $1")}:** ${subValue}\n\n`
                }
              })
            } else {
              formatted += `${index + 1}. ${item}\n`
            }
          })
        } else if (typeof value === "object" && value !== null) {
          Object.entries(value).forEach(([subKey, subValue]) => {
            formatted += `**${subKey.replace(/([A-Z])/g, " $1")}:** ${subValue}\n\n`
          })
        } else {
          formatted += `${value}\n`
        }
        formatted += "\n"
      })
    }

    return formatted
  }

  const selectedTemplate = formData.documentType ? getDocumentTemplate(formData.documentType) : null

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black font-montserrat text-foreground">Generate Professional Documents</h2>
        <p className="text-muted-foreground">Create proposals, bids, audits, and reports with AI assistance</p>
      </div>

      <Tabs defaultValue="configure" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configure">Configure</TabsTrigger>
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
          <TabsTrigger value="preview">Preview & Export</TabsTrigger>
          <TabsTrigger value="qa" disabled={!generatedDocument}>
            Quality Check
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configure" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Document Configuration
                </CardTitle>
                <CardDescription>Configure your document parameters and requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="document-type">Document Type</Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, documentType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type} value={type.toLowerCase()}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Document Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter document title"
                    className="bg-input"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements & Context</Label>
                  <Textarea
                    id="requirements"
                    placeholder="Describe your document requirements, target audience, key points to include..."
                    rows={6}
                    className="bg-input"
                    value={formData.requirements}
                    onChange={(e) => setFormData((prev) => ({ ...prev, requirements: e.target.value }))}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Document Visibility</Label>
                  <RadioGroup
                    value={formData.visibility}
                    onValueChange={(value: "private" | "organization" | "public") =>
                      setFormData((prev) => ({ ...prev, visibility: value }))
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                        <Lock className="h-4 w-4 text-gray-600" />
                        <div>
                          <div className="font-medium">Private</div>
                          <div className="text-xs text-muted-foreground">Only you can access this document</div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="organization" id="organization" />
                      <Label htmlFor="organization" className="flex items-center gap-2 cursor-pointer">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium">Organization</div>
                          <div className="text-xs text-muted-foreground">
                            Members of your organization can access this document
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                        <Globe className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium">Public</div>
                          <div className="text-xs text-muted-foreground">Anyone can access this document</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  Document Template Preview
                </CardTitle>
                <CardDescription>Preview the structure of your selected document type</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{selectedTemplate.type}</Badge>
                      {selectedTemplate.formatting.useExecutiveSummary && (
                        <Badge variant="outline">Executive Summary</Badge>
                      )}
                      {selectedTemplate.formatting.useTableOfContents && (
                        <Badge variant="outline">Table of Contents</Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Document Sections:</h4>
                      <div className="space-y-1">
                        {selectedTemplate.sections.map((section, index) => (
                          <div key={section} className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{index + 1}.</span>
                            <span>{section}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <div className="text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Select a document type to see template</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Upload Reference Files
              </CardTitle>
              <CardDescription>
                Upload documents that will be used as reference material for generating your document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload onFilesUploaded={setUploadedFileIds} maxFiles={10} />
              {uploadedFileIds.length > 0 && (
                <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                  <p className="text-sm text-primary font-medium">
                    {uploadedFileIds.length} file{uploadedFileIds.length !== 1 ? "s" : ""} ready for document generation
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Document</CardTitle>
                <CardDescription>Review your configuration and generate the document</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{formData.documentType || "Not selected"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="font-medium">{formData.title || "Not provided"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference Files:</span>
                    <span className="font-medium">{uploadedFileIds.length} files</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visibility:</span>
                    <span className="font-medium">{formData.visibility}</span>
                  </div>
                </div>

                {generationError && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <p className="text-sm text-destructive font-medium">{generationError.message}</p>
                        {generationError.isRateLimit && (
                          <p className="text-xs text-destructive/80">
                            Rate limit reached. Please wait a moment before trying again.
                          </p>
                        )}
                        {generationError.retryCount && generationError.retryCount > 0 && (
                          <p className="text-xs text-destructive/80">
                            Attempted {generationError.retryCount} time{generationError.retryCount > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    {generationError.retryable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetryGeneration}
                        disabled={isGenerating}
                        className="w-full border-destructive/20 text-destructive hover:bg-destructive/5 bg-transparent"
                      >
                        <RefreshCw className="mr-2 h-3 w-3" />
                        Try Again
                      </Button>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !formData.documentType || !formData.title || !formData.requirements}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Document...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Document
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Document Preview
                </CardTitle>
                <CardDescription>Preview and export your generated document</CardDescription>
              </CardHeader>
              <CardContent>
                {generatedDocument ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Generated on {new Date(generatedDocument.generatedAt).toLocaleDateString()}</span>
                      {generatedDocument.hasReferences && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            With References
                          </Badge>
                        </>
                      )}
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">
                        Structured JSON
                      </Badge>
                      {generatedDocument.metadata?.wordCount && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            {generatedDocument.metadata.wordCount} words
                          </Badge>
                        </>
                      )}
                    </div>
                    <div className="bg-muted p-4 rounded-lg min-h-[300px] max-h-[400px] overflow-y-auto">
                      <div className="space-y-2 mb-4">
                        <h3 className="font-semibold text-lg">{generatedDocument.title}</h3>
                        <p className="text-xs text-muted-foreground">{generatedDocument.type}</p>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm">
                          {formatStructuredDataForExport(generatedDocument.data, generatedDocument.type)}
                        </pre>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() =>
                          exportError && exportError.retryable ? handleRetryExport("pdf") : handleExport("pdf")
                        }
                        disabled={isExporting !== null}
                      >
                        {isExporting === "pdf" ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Exporting PDF...
                          </>
                        ) : exportError && exportError.retryable ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry PDF Export
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Export PDF
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() =>
                          exportError && exportError.retryable ? handleRetryExport("docx") : handleExport("docx")
                        }
                        disabled={isExporting !== null}
                      >
                        {isExporting === "docx" ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Exporting DOCX...
                          </>
                        ) : exportError && exportError.retryable ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry DOCX Export
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Export DOCX
                          </>
                        )}
                      </Button>
                    </div>

                    {exportError && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                          <div className="space-y-1 flex-1">
                            <p className="text-sm text-destructive font-medium">{exportError.message}</p>
                            {exportError.isRateLimit && (
                              <p className="text-xs text-destructive/80">
                                Export service is busy. Please try again in a moment.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Generated document will appear here</p>
                      <p className="text-xs mt-1">Configure and generate your document first</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="qa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Document Quality Assessment
              </CardTitle>
              <CardDescription>
                Automated quality review and improvement suggestions for your generated document
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRunningQA ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground">Running quality assessment...</p>
                  </div>
                </div>
              ) : qaResult ? (
                <QAResults qaResult={qaResult} onApplyFixes={handleApplyFixes} isApplyingFixes={isApplyingFixes} />
              ) : generatedDocument ? (
                <div className="text-center py-12">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    Quality assessment will run automatically after document generation
                  </p>
                  <Button onClick={() => runQualityAssurance(generatedDocument)} variant="outline">
                    Run Quality Check
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Generate a document first to see quality assessment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
