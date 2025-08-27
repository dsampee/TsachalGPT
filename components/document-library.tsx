"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, FileText, Loader2, Globe, Lock, Users } from "lucide-react"

interface Document {
  id: string
  title: string
  document_type: string
  status: string
  visibility: string
  word_count: number
  qa_score?: number
  created_at: string
  updated_at: string
  profiles: {
    full_name: string
    email: string
    organization: string
  }
}

interface DocumentLibraryProps {
  selectedDocument?: any
}

export function DocumentLibrary({ selectedDocument }: DocumentLibraryProps) {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isExporting, setIsExporting] = useState<{ docId: string; format: "pdf" | "docx" } | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Temporarily disabled automatic document fetching for smoke testing
  // useEffect(() => {
  //   fetchDocuments()
  // }, [])

  const fetchDocuments = async () => {
    // Temporarily disabled for smoke testing
    setLoading(false)
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    setIsDeleting(documentId)
    try {
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete document")
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
    } catch (error) {
      console.error("Error deleting document:", error)
    } finally {
      setIsDeleting(null)
    }
  }

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedFilter === "all" || doc.document_type.toLowerCase() === selectedFilter) &&
      (statusFilter === "all" || doc.status === statusFilter),
  )

  const handleExport = async (document: Document, format: "pdf" | "docx") => {
    setIsExporting({ docId: document.id, format })

    try {
      // First fetch the full document content
      const docResponse = await fetch(`/api/documents/${document.id}`)
      if (!docResponse.ok) {
        throw new Error("Failed to fetch document content")
      }

      const docResult = await docResponse.json()
      const fullDocument = docResult.document

      const response = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: fullDocument.title,
          content: JSON.stringify(fullDocument.content),
          type: fullDocument.document_type,
          generatedAt: fullDocument.created_at,
          jsonData: fullDocument.content,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to export ${format.toUpperCase()}`)
      }

      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${document.title.replace(/[^a-zA-Z0-9]/g, "_")}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setIsExporting(null)
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="h-3 w-3" />
      case "organization":
        return <Users className="h-3 w-3" />
      default:
        return <Lock className="h-3 w-3" />
    }
  }

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case "public":
        return "text-green-600"
      case "organization":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="text-slate-600">Loading documents...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black font-montserrat text-foreground">Document Library</h2>
          <p className="text-muted-foreground">Manage and organize your generated documents</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64 bg-input"
            />
          </div>
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="proposal">Proposals</SelectItem>
              <SelectItem value="audit">Audits</SelectItem>
              <SelectItem value="marine">Marine</SelectItem>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="hr-policy">HR Policies</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="final">Final</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredDocuments.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Document Library Ready</h3>
          <p className="text-muted-foreground mb-4">
            Library interface is ready for smoke testing. Documents will appear here once generated.
          </p>
          <Button>Create New Document</Button>
        </div>
      )}
    </div>
  )
}
