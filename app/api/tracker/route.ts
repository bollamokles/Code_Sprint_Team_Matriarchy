import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/require-auth'
import { supabaseAdmin } from '@/lib/supabase'

const VALID_TYPES = ['kanban', 'todo', 'goal', 'event'] as const

export async function GET(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  const itemType = req.nextUrl.searchParams.get('type')

  let query = supabaseAdmin
    .from('tracker_items')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (itemType && VALID_TYPES.includes(itemType as (typeof VALID_TYPES)[number])) {
    query = query.eq('item_type', itemType)
  }

  const { data, error } = await query
  if (error) {
    const msg = error.message ?? ''
    const tableMissing =
      /could not find the table/i.test(msg) || /relation .* does not exist/i.test(msg)
    if (tableMissing) return NextResponse.json({ items: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const body = await req.json()
    const { item_type, title, description, status, column_key, due_date, start_at, end_at, progress, position } =
      body

    if (!item_type || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!VALID_TYPES.includes(item_type)) {
      return NextResponse.json({ error: 'Invalid item_type' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('tracker_items')
      .insert({
        user_id: userId,
        item_type,
        title,
        description: description ?? null,
        status: status ?? 'pending',
        column_key: column_key ?? null,
        due_date: due_date ?? null,
        start_at: start_at ?? null,
        end_at: end_at ?? null,
        progress: progress ?? 0,
        position: position ?? 0,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const { id, ...updates } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const allowed = [
      'title',
      'description',
      'status',
      'column_key',
      'due_date',
      'start_at',
      'end_at',
      'progress',
      'position',
    ]
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in updates) patch[key] = updates[key]
    }

    const { data, error } = await supabaseAdmin
      .from('tracker_items')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
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

  const { error } = await supabaseAdmin
    .from('tracker_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
