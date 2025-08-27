import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  return createSampleUsers()
}

export async function POST() {
  return createSampleUsers()
}

async function createSampleUsers() {
  try {
    console.log("[v0] Starting sample users creation...")

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[v0] Missing Supabase environment variables")
      return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 })
    }

    // Create admin client using service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("[v0] Supabase admin client created")

    const sampleUsers = [
      {
        email: "admin@test.com",
        password: "admin123",
        role: "admin",
        full_name: "Admin User",
        organization: "TsachalGPT",
      },
      {
        email: "manager@test.com",
        password: "manager123",
        role: "manager",
        full_name: "Manager User",
        organization: "TsachalGPT",
      },
      {
        email: "auditor@test.com",
        password: "auditor123",
        role: "auditor",
        full_name: "Auditor User",
        organization: "TsachalGPT",
      },
      {
        email: "user1@test.com",
        password: "user123",
        role: "user",
        full_name: "User One",
        organization: "TsachalGPT",
      },
      {
        email: "user2@test.com",
        password: "user123",
        role: "user",
        full_name: "User Two",
        organization: "TsachalGPT",
      },
    ]

    const results = []

    for (const userData of sampleUsers) {
      try {
        console.log(`[v0] Creating user: ${userData.email}`)

        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
        const userExists = existingUser.users.some((user) => user.email === userData.email)

        if (userExists) {
          console.log(`[v0] User ${userData.email} already exists, skipping...`)
          results.push({ email: userData.email, success: true, status: "already_exists" })
          continue
        }

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true, // Skip email confirmation
          user_metadata: {
            full_name: userData.full_name,
            organization: userData.organization,
            role: userData.role,
          },
        })

        if (authError) {
          console.error(`[v0] Error creating user ${userData.email}:`, authError)
          results.push({ email: userData.email, success: false, error: authError.message })
          continue
        }

        console.log(`[v0] Auth user created for ${userData.email}, creating profile...`)

        // Create profile record
        const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
          id: authData.user.id,
          email: userData.email,
          full_name: userData.full_name,
          organization: userData.organization,
          role: userData.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (profileError) {
          console.error(`[v0] Error creating profile for ${userData.email}:`, profileError)
          results.push({ email: userData.email, success: false, error: profileError.message })
        } else {
          console.log(`[v0] Successfully created user and profile for ${userData.email}`)
          results.push({ email: userData.email, success: true, userId: authData.user.id, status: "created" })
        }
      } catch (error) {
        console.error(`[v0] Unexpected error for ${userData.email}:`, error)
        results.push({
          email: userData.email,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    console.log("[v0] Sample users creation completed")

    return NextResponse.json({
      message: "Sample users creation completed",
      results,
      summary: {
        total: sampleUsers.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
      credentials: {
        admin: "admin@test.com / admin123",
        manager: "manager@test.com / manager123",
        auditor: "auditor@test.com / auditor123",
        user1: "user1@test.com / user123",
        user2: "user2@test.com / user123",
      },
    })
  } catch (error) {
    console.error("[v0] Error in create-sample-users:", error)
    return NextResponse.json(
      {
        error: "Failed to create sample users",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
