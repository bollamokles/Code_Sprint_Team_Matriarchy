import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/require-auth'
import { supabaseAdmin } from '@/lib/supabase'

function isTableMissing(message: string) {
  return /could not find the table/i.test(message) || /relation .* does not exist/i.test(message)
}

function parseMonthRange(month: string): { from: string; to: string } | null {
  // month: YYYY-MM
  const m = month.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const year = Number(m[1])
  const mon = Number(m[2])
  if (!Number.isFinite(year) || !Number.isFinite(mon) || mon < 1 || mon > 12) return null
  const from = `${m[1]}-${m[2]}-01`
  const nextYear = mon === 12 ? year + 1 : year
  const nextMonth = mon === 12 ? 1 : mon + 1
  const to = `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-01`
  return { from, to }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  const month = req.nextUrl.searchParams.get('month') // YYYY-MM
  const date = req.nextUrl.searchParams.get('date') // YYYY-MM-DD

  let query = supabaseAdmin
    .from('todos')
    .select('id, user_id, text, due_date, done, created_at')
    .eq('user_id', userId)
    .order('done', { ascending: true })
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (date) {
    query = query.eq('due_date', date)
  } else if (month) {
    const range = parseMonthRange(month)
    if (!range) return NextResponse.json({ error: 'Invalid month format' }, { status: 400 })
    // include NULL due_date items only when no month filter is used
    query = query.gte('due_date', range.from).lt('due_date', range.to)
  }

  const { data, error } = await query
  if (error) {
    if (isTableMissing(error.message)) return NextResponse.json({ todos: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ todos: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const { text, due_date } = await req.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('todos')
      .insert({
        user_id: userId,
        text: text.trim(),
        due_date: due_date ?? null,
        done: false,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ todo: data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const { id, text, due_date, done } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const patch: Record<string, unknown> = {}
    if (typeof text === 'string') patch.text = text.trim()
    if (typeof due_date === 'string' || due_date === null) patch.due_date = due_date
    if (typeof done === 'boolean') patch.done = done

    const { data, error } = await supabaseAdmin
      .from('todos')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ todo: data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  const id = req.nextUrl.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('todos').delete().eq('id', id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

