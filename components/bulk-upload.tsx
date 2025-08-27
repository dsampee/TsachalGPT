"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface BulkUploadProps {
  categories: Array<{
    id: string
    name: string
    tags: string[]
  }>
  onUpload: (files: File[], category: string, metadata: any) => Promise<void>
  uploadProgress: Record<string, number>
}

interface FileWithMetadata extends File {
  id: string
  category?: string
  tags: Record<string, string>
  status: "pending" | "uploading" | "completed" | "error"
}

export function BulkUpload({ categories, onUpload, uploadProgress }: BulkUploadProps) {
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [globalTags, setGlobalTags] = useState<Record<string, string>>({})

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: FileWithMetadata[] = acceptedFiles.map((file) => ({
        ...file,
        id: Math.random().toString(36).substr(2, 9),
        category: selectedCategory,
        tags: { ...globalTags },
        status: "pending" as const,
      }))

      setFiles((prev) => [...prev, ...newFiles])
    },
    [selectedCategory, globalTags],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
  })

  const updateFileTag = (fileId: string, tagKey: string, tagValue: string) => {
    setFiles((prev) =>
      prev.map((file) => (file.id === fileId ? { ...file, tags: { ...file.tags, [tagKey]: tagValue } } : file)),
    )
  }

  const updateFileCategory = (fileId: string, category: string) => {
    setFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, category } : file)))
  }

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const handleBulkUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)

    try {
      // Group files by category
      const filesByCategory = files.reduce(
        (acc, file) => {
          const category = file.category || "uncategorized"
          if (!acc[category]) acc[category] = []
          acc[category].push(file)
          return acc
        },
        {} as Record<string, FileWithMetadata[]>,
      )

      // Upload each category
      for (const [category, categoryFiles] of Object.entries(filesByCategory)) {
        console.log(`[v0] Uploading ${categoryFiles.length} files for category: ${category}`)

        // Update file status to uploading
        setFiles((prev) =>
          prev.map((file) =>
            categoryFiles.some((cf) => cf.id === file.id) ? { ...file, status: "uploading" as const } : file,
          ),
        )

        const metadata = {
          category,
          tags: categoryFiles[0]?.tags || {},
          fileCount: categoryFiles.length,
        }

        await onUpload(categoryFiles, category, metadata)

        // Update file status to completed
        setFiles((prev) =>
          prev.map((file) =>
            categoryFiles.some((cf) => cf.id === file.id) ? { ...file, status: "completed" as const } : file,
          ),
        )
      }

      console.log(`[v0] Bulk upload completed successfully`)
    } catch (error) {
      console.error("[v0] Bulk upload failed:", error)
      // Update failed files status
      setFiles((prev) =>
        prev.map((file) => (file.status === "uploading" ? { ...file, status: "error" as const } : file)),
      )
    } finally {
      setIsUploading(false)
    }
  }

  const selectedCategoryData = categories.find((c) => c.id === selectedCategory)

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="default-category">Default Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select default category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCategoryData && (
          <div className="space-y-2">
            <Label>Global Tags (applied to all files)</Label>
            <div className="grid grid-cols-2 gap-2">
              {selectedCategoryData.tags.slice(0, 4).map((tag) => (
                <div key={tag} className="space-y-1">
                  <Label className="text-xs capitalize">{tag.replace("_", " ")}</Label>
                  <Input
                    placeholder={`Enter ${tag}`}
                    value={globalTags[tag] || ""}
                    onChange={(e) => setGlobalTags((prev) => ({ ...prev, [tag]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drop Zone */}
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed cursor-pointer transition-colors hover:bg-muted/50",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          isUploading && "opacity-50 cursor-not-allowed",
        )}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <input {...getInputProps()} />
          <Upload className={cn("h-12 w-12 mb-4", isDragActive ? "text-primary" : "text-muted-foreground")} />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isUploading
                ? "Processing files..."
                : isDragActive
                  ? "Drop your golden documents here"
                  : "Drag & drop your knowledge base documents"}
            </p>
            <p className="text-sm text-muted-foreground">
              Supports PDF, DOC, DOCX files • Recommended: 20-30 high-quality documents
            </p>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Uploaded Files ({files.length})</h3>
            <Button onClick={handleBulkUpload} disabled={isUploading || files.length === 0} className="min-w-32">
              {isUploading ? "Uploading..." : "Upload All"}
            </Button>
          </div>

          <div className="space-y-3">
            {files.map((file) => (
              <Card key={file.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === "uploading" && (
                        <div className="flex items-center gap-2">
                          <Progress value={uploadProgress[file.category || ""] || 0} className="w-20" />
                        </div>
                      )}
                      {file.status === "completed" && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Uploaded
                        </Badge>
                      )}
                      {file.status === "error" && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)} disabled={isUploading}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={file.category || ""}
                        onValueChange={(value) => updateFileCategory(file.id, value)}
                        disabled={isUploading}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedCategoryData && (
                      <div className="md:col-span-2 grid grid-cols-2 gap-2">
                        {selectedCategoryData.tags.slice(0, 4).map((tag) => (
                          <div key={tag} className="space-y-1">
                            <Label className="text-xs capitalize">{tag.replace("_", " ")}</Label>
                            <Input
                              className="h-8"
                              placeholder={`Enter ${tag}`}
                              value={file.tags[tag] || ""}
                              onChange={(e) => updateFileTag(file.id, tag, e.target.value)}
                              disabled={isUploading}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        File upload functionality is disabled for testing purposes. The interface is ready for integration.
      </div>
    </div>
  )
}
