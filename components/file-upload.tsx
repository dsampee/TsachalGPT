"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, File, X, CheckCircle, AlertCircle, Database, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface UploadedFile {
  id: string
  name: string
  size: number
  status: "uploading" | "completed" | "error"
  progress: number
  fileId?: string
}

interface VectorStore {
  id: string
  name: string
  status: string
  fileCount: number
}

interface FileUploadProps {
  onFilesUploaded: (fileIds: string[], vectorStore?: VectorStore) => void
  maxFiles?: number
  acceptedFileTypes?: string[]
}

export function FileUpload({ onFilesUploaded, maxFiles = 10, acceptedFileTypes }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [createVectorStore, setCreateVectorStore] = useState(false)
  const [vectorStoreName, setVectorStoreName] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const uploadFiles = async (filesToUpload: File[]): Promise<{ fileIds: string[]; vectorStore?: VectorStore }> => {
    const formData = new FormData()

    filesToUpload.forEach((file) => {
      formData.append("files", file)
    })

    if (createVectorStore) {
      formData.append("createVectorStore", "true")
      if (vectorStoreName.trim()) {
        formData.append("vectorStoreName", vectorStoreName.trim())
      }
    }

    console.log("[v0] Starting file upload with", filesToUpload.length, "files")
    console.log("[v0] Create vector store:", createVectorStore)
    console.log("[v0] Vector store name:", vectorStoreName)

    try {
      console.log("[v0] Making fetch request to /api/upload")
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response ok:", response.ok)

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
          console.log("[v0] Error response data:", errorData)
        } catch (parseError) {
          console.log("[v0] Failed to parse error response:", parseError)
          errorData = { error: `Upload failed with status ${response.status}` }
        }

        const errorMessage = errorData.error || `Upload failed with status ${response.status}`
        console.log("[v0] Throwing error:", errorMessage)
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log("[v0] Upload successful, result:", result)

      return {
        fileIds: result.files.map((f: any) => f.file_id),
        vectorStore: result.vectorStore,
      }
    } catch (error) {
      console.error("[v0] Upload error details:", error)
      console.error("[v0] Error type:", typeof error)
      console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))

      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          "Network error: Unable to connect to upload service. Please check your connection and try again.",
        )
      }

      throw error
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (isUploading) return
      if (files.length + acceptedFiles.length > maxFiles) {
        toast({
          title: "Too many files",
          description: `Maximum ${maxFiles} files allowed. You can upload ${maxFiles - files.length} more files.`,
          variant: "destructive",
        })
        return
      }

      setIsUploading(true)

      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        status: "uploading",
        progress: 0,
      }))

      setFiles((prev) => [...prev, ...newFiles])

      try {
        const progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((file) => {
              if (file.status === "uploading" && file.progress < 90) {
                return { ...file, progress: Math.min(file.progress + Math.random() * 15, 90) }
              }
              return file
            }),
          )
        }, 200)

        const result = await uploadFiles(acceptedFiles)

        clearInterval(progressInterval)

        setFiles((prev) =>
          prev.map((file, index) => {
            if (newFiles.some((nf) => nf.id === file.id)) {
              return {
                ...file,
                status: "completed",
                progress: 100,
                fileId: result.fileIds[index] || `file-${index}`,
              }
            }
            return file
          }),
        )

        const allFileIds = [
          ...files.filter((f) => f.status === "completed" && f.fileId).map((f) => f.fileId!),
          ...result.fileIds,
        ]
        onFilesUploaded(allFileIds, result.vectorStore)

        toast({
          title: "Upload successful",
          description: `${acceptedFiles.length} file(s) uploaded successfully${result.vectorStore ? " and vector store created" : ""}.`,
        })
      } catch (error) {
        console.error("[v0] Upload process failed:", error)

        setFiles((prev) =>
          prev.map((file) => {
            if (newFiles.some((nf) => nf.id === file.id)) {
              return { ...file, status: "error", progress: 0 }
            }
            return file
          }),
        )

        let errorMessage = "An error occurred during upload. Please try again."

        if (error instanceof Error) {
          errorMessage = error.message
          console.log("[v0] Specific error message:", errorMessage)
        }

        toast({
          title: "Upload failed",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    },
    [files, onFilesUploaded, createVectorStore, vectorStoreName, isUploading, maxFiles, toast],
  )

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    const remainingFileIds = files
      .filter((f) => f.id !== fileId && f.status === "completed" && f.fileId)
      .map((f) => f.fileId!)
    onFilesUploaded(remainingFileIds)

    toast({
      title: "File removed",
      description: "File has been removed from the upload list.",
    })
  }

  const retryUpload = async (fileId: string) => {
    const fileToRetry = files.find((f) => f.id === fileId)
    if (!fileToRetry) return

    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "uploading", progress: 0 } : f)))

    toast({
      title: "Retry functionality",
      description: "Please re-upload the file using the upload area.",
      variant: "default",
    })

    setTimeout(() => {
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
    }, 2000)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length > 0) {
      onDrop(selectedFiles)
    }
    event.target.value = ""
  }

  const getRootProps = () => ({
    onClick: () => {
      if (!isUploading) {
        document.getElementById("file-input")?.click()
      }
    },
  })

  const getInputProps = () => ({ style: { display: "none" } })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="vector-store"
              checked={createVectorStore}
              onCheckedChange={(checked) => setCreateVectorStore(checked as boolean)}
            />
            <Label htmlFor="vector-store" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Create Vector Store for Enhanced Search
            </Label>
          </div>

          {createVectorStore && (
            <div className="space-y-2">
              <Label htmlFor="store-name">Vector Store Name (Optional)</Label>
              <Input
                id="store-name"
                placeholder="e.g., Project Documents, Company Policies"
                value={vectorStoreName}
                onChange={(e) => setVectorStoreName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Vector stores enable semantic search across your uploaded documents for better context in generated
                content.
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed cursor-pointer transition-colors hover:bg-muted/50",
          isUploading && "opacity-50 cursor-not-allowed",
        )}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <input
            id="file-input"
            type="file"
            multiple
            accept={acceptedFileTypes?.join(",") || ".pdf,.doc,.docx,.txt,.csv"}
            onChange={handleFileSelect}
            disabled={isUploading}
            {...getInputProps()}
          />
          {isUploading ? (
            <RefreshCw className="h-10 w-10 mb-4 text-primary animate-spin" />
          ) : (
            <Upload className="h-10 w-10 mb-4 text-muted-foreground" />
          )}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {isUploading ? "Uploading files..." : "Click to select files or drag and drop"}
            </p>
            <p className="text-xs text-muted-foreground">
              Supports PDF, DOC, DOCX, TXT, CSV files (max {maxFiles} files)
            </p>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Uploaded Files ({files.filter((f) => f.status === "completed").length}/{files.length})
          </h4>
          {files.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.status === "uploading" && (
                    <div className="flex items-center gap-2">
                      <Progress value={file.progress} className="w-20" />
                      <span className="text-xs text-muted-foreground min-w-[3ch]">{Math.round(file.progress)}%</span>
                    </div>
                  )}
                  {file.status === "completed" && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                  {file.status === "error" && (
                    <div className="flex items-center gap-1">
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryUpload(file.id)}
                        className="h-6 px-2 text-xs"
                      >
                        Retry
                      </Button>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)} disabled={isUploading}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
