import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Create admin client for user management
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const sampleUsers = [
  {
    email: "admin@test.com",
    password: "admin123",
    full_name: "System Administrator",
    organization: "TsachalGPT",
    role: "admin",
  },
  {
    email: "manager@test.com",
    password: "manager123",
    full_name: "Project Manager",
    organization: "TsachalGPT",
    role: "manager",
  },
  {
    email: "auditor@test.com",
    password: "auditor123",
    full_name: "Quality Auditor",
    organization: "TsachalGPT",
    role: "auditor",
  },
  {
    email: "user1@test.com",
    password: "user123",
    full_name: "Regular User One",
    organization: "TsachalGPT",
    role: "user",
  },
  {
    email: "user2@test.com",
    password: "user123",
    full_name: "Regular User Two",
    organization: "TsachalGPT",
    role: "user",
  },
]

export async function POST() {
  try {
    const results = []

    for (const user of sampleUsers) {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Skip email confirmation
        user_metadata: {
          full_name: user.full_name,
          organization: user.organization,
          role: user.role,
        },
      })

      if (authError) {
        console.error(`Failed to create auth user ${user.email}:`, authError)
        results.push({ email: user.email, status: "auth_failed", error: authError.message })
        continue
      }

      // Create profile record
      const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
        id: authData.user.id,
        email: user.email,
        full_name: user.full_name,
        organization: user.organization,
        role: user.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (profileError) {
        console.error(`Failed to create profile for ${user.email}:`, profileError)
        results.push({ email: user.email, status: "profile_failed", error: profileError.message })
        continue
      }

      results.push({ email: user.email, status: "success", user_id: authData.user.id })
    }

    return NextResponse.json({
      message: "Sample users creation completed",
      results,
    })
  } catch (error) {
    console.error("Error creating sample users:", error)
    return NextResponse.json(
      { error: "Failed to create sample users", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to create sample users",
    users: sampleUsers.map((u) => ({ email: u.email, role: u.role })),
  })
}
