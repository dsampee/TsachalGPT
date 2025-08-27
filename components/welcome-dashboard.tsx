"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, TrendingUp, Clock, Star, BarChart3, Users, FileCheck } from "lucide-react"
import { useEffect, useState } from "react"

interface TelemetryStats {
  totalDocs: number
  thisMonth: number
  avgDurationMs: number | null
}

interface RecentActivity {
  id: string
  doc_type: string
  title: string
  created_at: string
}

interface TelemetryData {
  ok: boolean
  metrics: TelemetryStats
  recent: RecentActivity[]
}

const documentTemplates = [
  { name: "Business Proposal", icon: FileText, description: "Comprehensive business proposals", count: 12 },
  { name: "Audit Report", icon: BarChart3, description: "Professional audit documentation", count: 5 },
  { name: "HR Policy", icon: Users, description: "Employee policies and procedures", count: 7 },
  { name: "Bid Document", icon: FileCheck, description: "Competitive bidding documents", count: 8 },
]

interface WelcomeDashboardProps {
  onNewDocument: () => void
}

export function WelcomeDashboard({ onNewDocument }: WelcomeDashboardProps) {
  const [telemetryData, setTelemetryData] = useState<TelemetryData>({
    ok: false,
    metrics: {
      totalDocs: 0,
      thisMonth: 0,
      avgDurationMs: null,
    },
    recent: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchTelemetry = async (isRetry = false) => {
    try {
      console.log("[v0] Dashboard: Starting telemetry fetch", { isRetry, retryCount })
      setError(null)

      if (!isRetry) {
        setLoading(true)
      }

      const response = await fetch("/api/telemetry", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-cache",
      })

      console.log("[v0] Dashboard: Telemetry response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Dashboard: Telemetry API error:", { status: response.status, error: errorText })
        throw new Error(`API returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("[v0] Dashboard: Telemetry data received:", {
        ok: data.ok,
        metricsCount: Object.keys(data.metrics || {}).length,
        recentCount: data.recent?.length || 0,
      })

      setTelemetryData(data)
      setRetryCount(0) // Reset retry count on success
    } catch (error) {
      console.error("[v0] Dashboard: Failed to fetch telemetry:", error)

      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(`Failed to load dashboard data: ${errorMessage}`)

      if (retryCount < 3) {
        const retryDelay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        console.log(`[v0] Dashboard: Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/3)`)

        setTimeout(() => {
          setRetryCount((prev) => prev + 1)
          fetchTelemetry(true)
        }, retryDelay)
      } else {
        console.log("[v0] Dashboard: Max retries reached, using fallback data")
        setTelemetryData({
          ok: false,
          metrics: {
            totalDocs: 5,
            thisMonth: 3,
            avgDurationMs: 42000,
          },
          recent: [
            {
              id: "fallback-1",
              doc_type: "proposal",
              title: "Sample Proposal",
              created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            },
            {
              id: "fallback-2",
              doc_type: "audit",
              title: "Audit Report",
              created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            },
          ],
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setRetryCount(0)
    setError(null)
    fetchTelemetry()
  }

  useEffect(() => {
    fetchTelemetry()
    const interval = setInterval(() => fetchTelemetry(), 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const quickStats = [
    {
      label: "Documents Created",
      value: loading ? "..." : telemetryData.metrics.totalDocs.toString(),
      change: "+12%",
      icon: FileText,
    },
    {
      label: "This Month",
      value: loading ? "..." : telemetryData.metrics.thisMonth.toString(),
      change: "+25%",
      icon: TrendingUp,
    },
    {
      label: "Templates Used",
      value: loading ? "..." : "4", // Static for now since not in new API
      change: "0%",
      icon: Star,
    },
    {
      label: "Avg. Generation Time",
      value: loading
        ? "..."
        : telemetryData.metrics.avgDurationMs
          ? `${Math.round(telemetryData.metrics.avgDurationMs / 1000)}s`
          : "N/A",
      change: "-8%",
      icon: Clock,
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-black font-montserrat text-foreground">Welcome to TsachalGPT</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Generate professional documents with AI assistance. Create proposals, audits, reports, and more in minutes.
          </p>
        </div>
        <Button size="lg" onClick={onNewDocument} className="text-lg px-8 py-3">
          <Plus className="mr-2 h-5 w-5" />
          Create New Document
        </Button>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-destructive rounded-full" />
                <p className="text-sm text-destructive font-medium">Dashboard Data Unavailable</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {error} {retryCount > 0 && `(Attempt ${retryCount}/3)`}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center gap-1">
                    <Badge variant={stat.change.startsWith("+") ? "default" : "secondary"} className="text-xs">
                      {stat.change}
                    </Badge>
                  </div>
                </div>
                <stat.icon className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Document Templates
            </CardTitle>
            <CardDescription>Choose from professional templates to get started quickly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {documentTemplates.map((template) => (
              <div
                key={template.name}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                onClick={onNewDocument}
              >
                <div className="flex items-center gap-3">
                  <template.icon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                </div>
                <Badge variant="secondary">{template.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest document generations across all users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading activity...</div>
            ) : error && telemetryData.recent.length === 0 ? (
              <div className="text-center py-4 space-y-2">
                <p className="text-muted-foreground">Unable to load recent activity</p>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  Try Again
                </Button>
              </div>
            ) : telemetryData.recent.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No recent activity</div>
            ) : (
              telemetryData.recent.map((activity) => {
                const timeAgo = formatTimeAgo(new Date(activity.created_at))
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="h-2 w-2 bg-primary rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">Generated</span> {activity.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {activity.doc_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{timeAgo}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <Button variant="outline" className="w-full mt-4 bg-transparent">
              View All Activity
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  return `${diffDays} days ago`
}
