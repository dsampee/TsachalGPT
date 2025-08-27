"use client"

import { useState } from "react"
import { DocumentGenerator } from "@/components/document-generator"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { DocumentLibrary } from "@/components/document-library"
import { WelcomeDashboard } from "@/components/welcome-dashboard"

type ViewMode = "welcome" | "generator" | "library"

export default function HomePage() {
  const [currentView, setCurrentView] = useState<ViewMode>("welcome")
  const [selectedDocument, setSelectedDocument] = useState<any>(null)

  const handleNewDocument = () => {
    setCurrentView("generator")
    setSelectedDocument(null)
  }

  const handleDocumentSelect = (document: any) => {
    setSelectedDocument(document)
    setCurrentView("library")
  }

  const handleViewLibrary = () => {
    setCurrentView("library")
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        onNewDocument={handleNewDocument}
        onUploadFiles={() => setCurrentView("generator")}
        onDocumentSelect={handleDocumentSelect}
      />
      <div className="flex-1 flex flex-col">
        <Header currentView={currentView} onViewChange={setCurrentView} onViewLibrary={handleViewLibrary} />
        <main className="flex-1 overflow-auto">
          {currentView === "welcome" && <WelcomeDashboard onNewDocument={handleNewDocument} />}
          {currentView === "generator" && <DocumentGenerator />}
          {currentView === "library" && <DocumentLibrary selectedDocument={selectedDocument} />}
        </main>
      </div>
    </div>
  )
}
