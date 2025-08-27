"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, AlertCircle, RefreshCw, FileCheck } from "lucide-react"

interface QAResult {
  score: number
  overallAssessment: string
  checklistResults: Array<{
    id: string
    question: string
    status: "pass" | "fail" | "partial"
    score: number
    feedback: string
    suggestions: string[]
  }>
  gaps: string[]
  recommendations: string[]
  fixed?: any
}

interface QAResultsProps {
  qaResult: QAResult
  onApplyFixes?: () => void
  isApplyingFixes?: boolean
}

export function QAResults({ qaResult, onApplyFixes, isApplyingFixes }: QAResultsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "partial":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pass: "default" as const,
      fail: "destructive" as const,
      partial: "secondary" as const,
    }
    return variants[status as keyof typeof variants] || "outline"
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Quality Assessment
            </span>
            <div className={`text-2xl font-bold ${getScoreColor(qaResult.score)}`}>{qaResult.score}/100</div>
          </CardTitle>
          <CardDescription>{qaResult.overallAssessment}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Quality Score</span>
                <span className={getScoreColor(qaResult.score)}>{qaResult.score}%</span>
              </div>
              <Progress value={qaResult.score} className="h-2" />
            </div>

            {qaResult.fixed && (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Improved version available
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={onApplyFixes}
                  disabled={isApplyingFixes}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isApplyingFixes ? "Applying..." : "Apply Fixes"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checklist Results */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Assessment</CardTitle>
          <CardDescription>Quality checklist evaluation results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {qaResult.checklistResults.map((result, index) => (
              <div key={result.id} className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{result.question}</span>
                        <Badge variant={getStatusBadge(result.status)} className="text-xs">
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{result.feedback}</p>
                      {result.suggestions.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">Suggestions:</span>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {result.suggestions.map((suggestion, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span>•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${getScoreColor(result.score)}`}>{result.score}%</span>
                  </div>
                </div>
                {index < qaResult.checklistResults.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Critical Gaps */}
      {qaResult.gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Critical Gaps
            </CardTitle>
            <CardDescription>Issues that must be addressed before finalization</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {qaResult.gaps.map((gap, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span className="text-sm">{gap}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {qaResult.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <AlertCircle className="h-5 w-5" />
              Recommendations
            </CardTitle>
            <CardDescription>Suggestions for improving document quality</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {qaResult.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
