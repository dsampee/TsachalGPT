"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FileText, Lock } from "lucide-react"

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-emerald-600 p-3 rounded-xl">
              <FileText className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">TsachalGPT</h1>
          <p className="text-slate-600">Professional Document Generation Platform</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <Lock className="h-12 w-12 text-slate-400" />
            </div>
            <CardTitle className="text-2xl font-semibold">Access Restricted</CardTitle>
            <CardDescription>
              Public registration is disabled. Please contact your administrator to request access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Only administrators can create new user accounts. If you need access to
                TsachalGPT, please reach out to your system administrator.
              </p>
            </div>

            <div className="text-center space-y-4">
              <Link href="/auth/login">
                <Button className="w-full h-11">Back to Login</Button>
              </Link>

              <p className="text-xs text-slate-500">
                Already have an account? Use the login page to access your account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
