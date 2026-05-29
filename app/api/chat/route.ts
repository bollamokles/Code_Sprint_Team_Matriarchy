import { NextRequest, NextResponse } from 'next/server'
import { ollamaChat } from '@/lib/ollama'
import { requireAuthUserId } from '@/lib/require-auth'
import { queryCV, formatCVContext } from '@/lib/rag'
import { supabaseAdmin } from '@/lib/supabase'

const SYSTEM_PROMPT = `You are CareerPilot, an expert career co-pilot. Answer using ONLY the candidate's CV context provided below. Be specific, actionable, and encouraging. If the CV lacks information needed to answer, say so and suggest what to add. Keep answers concise unless the user asks for detail.`

export async function POST(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const { message, systemPrompt } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    const cvChunks = await queryCV(userId, message, 6)
    const cvContext = formatCVContext(cvChunks)

    const effectiveSystemPrompt = typeof systemPrompt === 'string' && systemPrompt.trim() ? systemPrompt.trim() : SYSTEM_PROMPT

    const reply = await ollamaChat([
      { role: 'system', content: `${effectiveSystemPrompt}\n\n--- CV CONTEXT ---\n${cvContext}` },
      { role: 'user', content: message.trim() },
    ])

    await supabaseAdmin.from('chat_messages').insert([
      { user_id: userId, role: 'user', content: message.trim() },
      { user_id: userId, role: 'assistant', content: reply },
    ])

    return NextResponse.json({ reply, sources: cvChunks.map((c) => c.section) })
  } catch (err) {
    console.error('CHAT ERROR:', err)
    const errorMsg =
      err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}

export async function GET() {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data ?? [] })
}
