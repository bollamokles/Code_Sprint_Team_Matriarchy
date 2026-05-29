import { NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/require-auth'
import { supabaseAdmin } from '@/lib/supabase'

function isTableMissing(message: string) {
  return /could not find the table/i.test(message) || /relation .* does not exist/i.test(message)
}

export async function GET() {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  const { data, error } = await supabaseAdmin
    .from('cv_chunks')
    .select('content')
    .eq('user_id', userId)
    .eq('section', 'skills')

  if (error) {
    if (isTableMissing(error.message)) return NextResponse.json({ skills: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ skills: (data ?? []).map((d) => String(d.content ?? '')) })
}

