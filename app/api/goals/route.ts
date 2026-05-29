import { NextRequest, NextResponse } from 'next/server'
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
    .from('goals')
    .select('id, user_id, text, target, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    if (isTableMissing(error.message)) return NextResponse.json({ goals: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ goals: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const { text, target } = await req.json()
    if (!text?.trim() || !Number.isFinite(Number(target))) {
      return NextResponse.json({ error: 'Missing text or target' }, { status: 400 })
    }

    const targetInt = Math.max(1, Math.floor(Number(target)))

    const { data, error } = await supabaseAdmin
      .from('goals')
      .insert({
        user_id: userId,
        text: text.trim(),
        target: targetInt,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ goal: data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const { id, text, target } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const patch: Record<string, unknown> = {}
    if (typeof text === 'string') patch.text = text.trim()
    if (target !== undefined) patch.target = Math.max(1, Math.floor(Number(target)))

    const { data, error } = await supabaseAdmin
      .from('goals')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ goal: data })
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

  const { error } = await supabaseAdmin.from('goals').delete().eq('id', id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

