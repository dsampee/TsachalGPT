"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BulkUpload } from "@/components/bulk-upload"
import { VectorStoreManager } from "@/components/vector-store-manager"
import { Upload } from "lucide-react"

interface DocumentCategory {
  id: string
  name: string
  description: string
  targetCount: number
  currentCount: number
  examples: string[]
  tags: string[]
}

const documentCategories: DocumentCategory[] = [
  {
    id: "proposals",
    name: "Winning Proposals & Bids",
    description: "High-quality successful proposals and bid documents",
    targetCount: 10,
    currentCount: 0,
    examples: [
      "Marine_Survey_Proposal_Shell_2023_Gulf.pdf",
      "Engineering_Audit_BP_2024_North_Sea.pdf",
      "HSE_Compliance_Bid_Chevron_2023_West_Africa.pdf",
    ],
    tags: ["client", "year", "service_type", "region"],
  },
  {
    id: "audits",
    name: "Audit Reports with CAPAs",
    description: "Complete audit reports including Corrective and Preventive Actions",
    targetCount: 8,
    currentCount: 0,
    examples: [
      "ISO9001_Audit_Report_TotalEnergies_2024_CAPA.pdf",
      "HSE_Audit_Equinor_2023_North_Sea_CAPAs.pdf",
      "Quality_Audit_Shell_2024_Gulf_Mexico.pdf",
    ],
    tags: ["iso_standard", "client", "year", "region", "capa_count"],
  },
  {
    id: "marine_reports",
    name: "Marine & Engineering Reports",
    description: "Comprehensive marine surveys and engineering inspection reports",
    targetCount: 5,
    currentCount: 0,
    examples: [
      "Vessel_Survey_FPSO_Petrobras_2024_Brazil.pdf",
      "Marine_Inspection_Aker_2023_Norway.pdf",
      "Engineering_Report_Subsea_Shell_2024.pdf",
    ],
    tags: ["vessel_type", "client", "year", "region", "inspection_type"],
  },
  {
    id: "standards",
    name: "ISO & HSE Manuals",
    description: "Company ISO standards and Health, Safety & Environment manuals",
    targetCount: 4,
    currentCount: 0,
    examples: ["ISO9001_Company_Manual_2024.pdf", "HSE_Policy_Manual_2024.pdf", "ISO14001_Environmental_Manual.pdf"],
    tags: ["standard_type", "version", "year"],
  },
  {
    id: "templates",
    name: "Brand Templates & Boilerplates",
    description: "Company branding templates, CVs, and standard Terms & Conditions",
    targetCount: 3,
    currentCount: 0,
    examples: ["Company_Brand_Guidelines_2024.pdf", "Standard_Terms_Conditions_2024.pdf", "Executive_CV_Template.pdf"],
    tags: ["template_type", "version", "year"],
  },
  {
    id: "method_statements",
    name: "Method Statements",
    description: "Detailed method statements and operational procedures",
    targetCount: 3,
    currentCount: 0,
    examples: [
      "Marine_Survey_Method_Statement_2024.pdf",
      "HSE_Inspection_Procedure_2024.pdf",
      "Quality_Audit_Method_Statement.pdf",
    ],
    tags: ["procedure_type", "version", "year", "application"],
  },
]

export function KnowledgeBaseManager() {
  const [selectedCategory, setSelectedCategory] = useState<string>("proposals")
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const handleBulkUpload = async (files: File[], category: string, metadata: any) => {
    // Implementation for bulk upload with progress tracking
    console.log(`[v0] Starting bulk upload for category: ${category}`, { files: files.length, metadata })

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress((prev) => ({ ...prev, [category]: i }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    console.log(`[v0] Bulk upload completed for category: ${category}`)
  }

  const getCategoryStatus = (category: DocumentCategory) => {
    const progress = (category.currentCount / category.targetCount) * 100
    if (progress === 0) return { status: "empty", color: "secondary" }
    if (progress < 50) return { status: "partial", color: "destructive" }
    if (progress < 100) return { status: "progress", color: "default" }
    return { status: "complete", color: "secondary" }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories">Document Categories</TabsTrigger>
          <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
          <TabsTrigger value="vector-stores">Vector Stores</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documentCategories.map((category) => {
              const { status, color } = getCategoryStatus(category)
              return (
                <Card key={category.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <CardDescription className="text-sm">{category.description}</CardDescription>
                      </div>
                      <Badge variant={color as any}>
                        {category.currentCount}/{category.targetCount}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round((category.currentCount / category.targetCount) * 100)}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(category.currentCount / category.targetCount) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Naming Examples:</h4>
                      <div className="space-y-1">
                        {category.examples.slice(0, 2).map((example, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground font-mono bg-muted p-1 rounded">
                            {example}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Required Tags:</h4>
                      <div className="flex flex-wrap gap-1">
                        {category.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      variant={status === "empty" ? "default" : "outline"}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {status === "empty" ? "Start Upload" : "Add More"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="bulk-upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Document Upload</CardTitle>
              <CardDescription>
                Upload multiple documents at once with automatic categorization and tagging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkUpload categories={documentCategories} onUpload={handleBulkUpload} uploadProgress={uploadProgress} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vector-stores" className="space-y-4">
          <VectorStoreManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
