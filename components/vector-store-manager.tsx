"use client"

import { cn } from "@/lib/utils"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Database, Trash2, RefreshCw, Search, FileText } from "lucide-react"

interface VectorStore {
  id: string
  name: string
  status: string
  fileCount: number
  createdAt: string
  category?: string
}

export function VectorStoreManager() {
  const [vectorStores, setVectorStores] = useState<VectorStore[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Mock data for demonstration
  useEffect(() => {
    setVectorStores([
      {
        id: "vs_1",
        name: "Winning Proposals Collection",
        status: "completed",
        fileCount: 8,
        createdAt: "2024-01-15",
        category: "proposals",
      },
      {
        id: "vs_2",
        name: "Audit Reports with CAPAs",
        status: "completed",
        fileCount: 6,
        createdAt: "2024-01-14",
        category: "audits",
      },
      {
        id: "vs_3",
        name: "Marine Engineering Reports",
        status: "processing",
        fileCount: 3,
        createdAt: "2024-01-13",
        category: "marine_reports",
      },
    ])
  }, [])

  const handleDeleteVectorStore = async (storeId: string) => {
    setIsLoading(true)
    try {
      console.log(`[v0] Deleting vector store: ${storeId}`)
      // Implementation for deleting vector store
      setVectorStores((prev) => prev.filter((store) => store.id !== storeId))
    } catch (error) {
      console.error("[v0] Failed to delete vector store:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshStores = async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Refreshing vector stores")
      // Implementation for refreshing vector stores
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error("[v0] Failed to refresh vector stores:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredStores = vectorStores.filter(
    (store) =>
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "secondary"
      case "processing":
        return "default"
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Vector Store Management</h2>
          <p className="text-muted-foreground">Manage your knowledge base vector stores for enhanced document search</p>
        </div>
        <Button onClick={handleRefreshStores} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vector stores..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStores.map((store) => (
          <Card key={store.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    {store.name}
                  </CardTitle>
                  <CardDescription>Created {new Date(store.createdAt).toLocaleDateString()}</CardDescription>
                </div>
                <Badge variant={getStatusColor(store.status) as any}>{store.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{store.fileCount} documents</span>
                </div>
                {store.category && (
                  <Badge variant="outline" className="text-xs">
                    {store.category.replace("_", " ")}
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  View Files
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteVectorStore(store.id)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStores.length === 0 && (
        <Card className="p-8 text-center">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Vector Stores Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "No stores match your search criteria."
              : "Start by uploading documents to create your first vector store."}
          </p>
          {searchTerm && (
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Clear Search
            </Button>
          )}
        </Card>
      )}
    </div>
  )
}
