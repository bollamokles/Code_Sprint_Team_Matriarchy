import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Demo accounts to create
const DEMO_ACCOUNTS = [
  { email: 'sarah.chen@demo.com', password: 'demo123', full_name: 'Sarah Chen' },
  { email: 'marcus.j@demo.com', password: 'demo123', full_name: 'Marcus Johnson' },
  { email: 'emily.r@demo.com', password: 'demo123', full_name: 'Emily Rodriguez' },
]

export async function POST() {
  // Use service role key to create users (admin access)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const results = []

  for (const account of DEMO_ACCOUNTS) {
    try {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const userExists = existingUsers?.users?.some(u => u.email === account.email)

      if (userExists) {
        results.push({ email: account.email, status: 'already exists' })
        continue
      }

      // Create user with admin API
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true, // Auto-confirm email for demo accounts
        user_metadata: {
          full_name: account.full_name,
        },
      })

      if (error) {
        results.push({ email: account.email, status: 'error', message: error.message })
      } else {
        results.push({ email: account.email, status: 'created', userId: data.user?.id })
      }
    } catch (err) {
      results.push({ email: account.email, status: 'error', message: String(err) })
    }
  }

  return NextResponse.json({ success: true, results })
}

export async function GET() {
  return NextResponse.json({ 
    message: 'POST to this endpoint to seed demo accounts',
    accounts: DEMO_ACCOUNTS.map(a => ({ email: a.email, password: a.password }))
  })
}
