import { NextRequest, NextResponse } from 'next/server'
import { ollamaChat } from '@/lib/ollama'
import { queryCV, formatCVContext } from '@/lib/rag'
import { supabaseAdmin } from '@/lib/supabase'

const SYSTEM_PROMPT = `You are CareerPilot, an expert career co-pilot. Answer using ONLY the candidate's CV context provided below. Be specific, actionable, and encouraging. If the CV lacks information needed to answer, say so and suggest what to add. Keep answers concise unless the user asks for detail.`

export async function POST(req: NextRequest) {
  try {
    const { userId, message } = await req.json()

    if (!userId || !message?.trim()) {
      return NextResponse.json({ error: 'Missing userId or message' }, { status: 400 })
    }

    const cvChunks = await queryCV(userId, message, 6)
    const cvContext = formatCVContext(cvChunks)

    const reply = await ollamaChat([
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n--- CV CONTEXT ---\n${cvContext}` },
      { role: 'user', content: message.trim() },
    ])

    await supabaseAdmin.from('chat_messages').insert([
      { user_id: userId, role: 'user', content: message.trim() },
      { user_id: userId, role: 'assistant', content: reply },
    ])

    return NextResponse.json({ reply, sources: cvChunks.map((c) => c.section) })
  } catch (err) {
    console.error('CHAT ERROR:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data ?? [] })
}
