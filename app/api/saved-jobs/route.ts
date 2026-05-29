import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/require-auth'
import { supabaseAdmin } from '@/lib/supabase'

function isTableMissing(message: string) {
  return /could not find the table/i.test(message) || /relation .* does not exist/i.test(message)
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  const limitRaw = req.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.max(1, Math.min(20, Math.floor(Number(limitRaw)))) : 3

  const { data, error } = await supabaseAdmin
    .from('saved_jobs')
    .select('external_id, title, company, location, description, url, salary_min, salary_max, fit_score, fit_reason, created_at')
    .eq('user_id', userId)
    .order('fit_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (isTableMissing(error.message)) return NextResponse.json({ jobs: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ jobs: data ?? [] })
}

