import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// This endpoint creates the actual auth users in Supabase
// It should only be called once during setup
export async function POST() {
  try {
    // Use service role key for admin operations
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const sampleUsers = [
      {
        email: "admin@test.com",
        password: "admin123",
        user_metadata: {
          full_name: "System Administrator",
          role: "admin",
          organization: "TsachalGPT Corp",
        },
      },
      {
        email: "manager@test.com",
        password: "manager123",
        user_metadata: {
          full_name: "Project Manager",
          role: "manager",
          organization: "TsachalGPT Corp",
        },
      },
      {
        email: "auditor@test.com",
        password: "auditor123",
        user_metadata: {
          full_name: "Senior Auditor",
          role: "auditor",
          organization: "TsachalGPT Corp",
        },
      },
      {
        email: "user1@test.com",
        password: "user123",
        user_metadata: {
          full_name: "John Smith",
          role: "user",
          organization: "TsachalGPT Corp",
        },
      },
      {
        email: "user2@test.com",
        password: "user123",
        user_metadata: {
          full_name: "Jane Doe",
          role: "user",
          organization: "TsachalGPT Corp",
        },
      },
    ]

    const results = []

    for (const user of sampleUsers) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        user_metadata: user.user_metadata,
        email_confirm: true, // Auto-confirm email
      })

      if (error) {
        console.error(`Error creating user ${user.email}:`, error)
        results.push({ email: user.email, success: false, error: error.message })
      } else {
        console.log(`Successfully created user ${user.email}`)
        results.push({ email: user.email, success: true, id: data.user?.id })
      }
    }

    return NextResponse.json({
      message: "Sample users creation completed",
      results,
    })
  } catch (error) {
    console.error("Error in create-sample-users:", error)
    return NextResponse.json({ error: "Failed to create sample users" }, { status: 500 })
  }
}
