"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  Upload,
  FileCheck,
  Users,
  BarChart3,
  ClipboardList,
  Plus,
  History,
  Search,
  Filter,
  Star,
  Clock,
  Shield,
  Database,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

const documentTypes = [
  { name: "Proposals", icon: FileText, count: 12, color: "text-blue-600" },
  { name: "Bids", icon: FileCheck, count: 8, color: "text-green-600" },
  { name: "Audits", icon: BarChart3, count: 5, color: "text-purple-600" },
  { name: "Reports", icon: ClipboardList, count: 15, color: "text-orange-600" },
  { name: "HR Policies", icon: Users, count: 7, color: "text-pink-600" },
]

const recentDocuments = [
  { name: "Q4 Financial Proposal", type: "Proposal", date: "2 hours ago", starred: true },
  { name: "Security Audit Report", type: "Audit", date: "1 day ago", starred: false },
  { name: "Employee Handbook", type: "HR Policy", date: "3 days ago", starred: true },
  { name: "Project Bid - ABC Corp", type: "Bid", date: "1 week ago", starred: false },
]

interface SidebarProps {
  onNewDocument?: () => void
  onUploadFiles?: () => void
  onDocumentSelect?: (document: any) => void
}

export function Sidebar({ onNewDocument, onUploadFiles, onDocumentSelect }: SidebarProps) {
  const { profile } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string | null>(null)

  const filteredDocuments = recentDocuments.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedType === null || doc.type === selectedType),
  )

  return (
    <aside className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Button className="w-full justify-start" size="lg" onClick={onNewDocument}>
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Button>

          <Button variant="outline" className="w-full justify-start bg-transparent" size="lg" onClick={onUploadFiles}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>

          {profile?.role === "admin" && (
            <>
              <Link href="/admin/knowledge-base">
                <Button variant="outline" className="w-full justify-start bg-transparent" size="lg">
                  <Database className="mr-2 h-4 w-4" />
                  Knowledge Base
                </Button>
              </Link>

              <Link href="/admin/users">
                <Button variant="outline" className="w-full justify-start bg-transparent" size="lg">
                  <Shield className="mr-2 h-4 w-4" />
                  User Management
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-input"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-sidebar-foreground">Document Types</h3>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Filter className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-1">
            {documentTypes.map((type) => (
              <Card
                key={type.name}
                className={`p-3 hover:bg-sidebar-accent cursor-pointer transition-colors ${
                  selectedType === type.name ? "bg-sidebar-accent border-sidebar-primary" : ""
                }`}
                onClick={() => setSelectedType(selectedType === type.name ? null : type.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <type.icon className={`h-4 w-4 ${type.color}`} />
                    <span className="text-sm font-medium">{type.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {type.count}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-sidebar-primary" />
            <h3 className="text-sm font-semibold text-sidebar-foreground">Recent Documents</h3>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2 pb-4">
          {filteredDocuments.map((doc, index) => (
            <Card
              key={index}
              className="p-3 hover:bg-sidebar-accent cursor-pointer transition-colors group"
              onClick={() => onDocumentSelect?.(doc)}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate group-hover:text-sidebar-primary transition-colors">
                      {doc.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {doc.type}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {doc.date}
                      </div>
                    </div>
                  </div>
                  {doc.starred && <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />}
                </div>
              </div>
            </Card>
          ))}

          {filteredDocuments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents found</p>
              {searchQuery && <p className="text-xs mt-1">Try adjusting your search</p>}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border">
        {profile && (
          <div className="mb-3 p-2 bg-sidebar-accent rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant={profile.role === "admin" ? "destructive" : "secondary"} className="text-xs">
                {profile.role}
              </Badge>
              <span className="text-xs text-muted-foreground truncate">{profile.organization}</span>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Documents</span>
            <span>{recentDocuments.length}/100</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1">
            <div
              className="bg-primary h-1 rounded-full transition-all"
              style={{ width: `${(recentDocuments.length / 100) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  )
}
