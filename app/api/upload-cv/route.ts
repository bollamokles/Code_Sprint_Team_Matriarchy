import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/require-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { embedText } from '@/lib/embeddings'
import { extractTextFromFile } from '@/lib/cv-parser'
import { chunkCVBySection } from '@/lib/cv-chunker'
import { ollamaChat } from '@/lib/ollama'

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const anyErr = err as Record<string, unknown>
    const message = anyErr.message
    if (typeof message === 'string' && message.trim()) return message
    // Supabase/PostgREST errors often include details/hint; include them when present.
    const details = typeof anyErr.details === 'string' ? anyErr.details : undefined
    const hint = typeof anyErr.hint === 'string' ? anyErr.hint : undefined
    try {
      const baseField = anyErr.error
      const base = baseField ? String(baseField) : JSON.stringify(anyErr)
      const suffix = [details, hint].filter(Boolean).join(' | ')
      return suffix ? `${base}: ${suffix}` : base
    } catch {
      return JSON.stringify(anyErr)
    }
  }
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

function formatPgvectorDimensionMismatch(message: string): string | null {
  // Example: "expected 3072 dimensions, not 768"
  const m = message.match(/expected\s+(\d+)\s+dimensions?,\s+not\s+(\d+)/i)
  if (!m) return null
  const expected = Number(m[1])
  const actual = Number(m[2])
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) return null
  return [
    `Embedding dimension mismatch: DB expects ${expected}-dim vectors, but Ollama returned ${actual}-dim vectors.`,
    `Fix by updating your Supabase schema so \`cv_chunks.embedding\` and \`match_cv_chunks\` use vector(${actual})`,
    `or switch your embedding model to produce ${expected} dimensions.`,
  ].join(' ')
}

export async function POST(req: NextRequest) {
  console.log('POST /api/upload-cv: started')
  try {
    const auth = await requireAuthUserId()
    if ('response' in auth) {
      return auth.response
    }
    const { userId } = auth

    const startedAt = Date.now()
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    // Keep binary data as `Uint8Array` to avoid `pdf.js` rejecting Node `Buffer`.
    const rawBinary = new Uint8Array(await file.arrayBuffer())
    console.log('UPLOAD: extracting text…', { fileName: file.name, userId })
    const rawText = await extractTextFromFile(rawBinary, file.name)
    console.log('UPLOAD: extracted text chars', rawText?.length ?? 0)
    const chunks = chunkCVBySection(rawText)
    console.log('UPLOAD: chunked', { chunks: chunks.length, sections: Array.from(new Set(chunks.map((c) => c.section))) })

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Could not extract text from CV' }, { status: 400 })
    }

    await supabaseAdmin.from('cv_chunks').delete().eq('user_id', userId)

    const sections: Record<string, number> = {}
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx]
      sections[chunk.section] = (sections[chunk.section] ?? 0) + 1
      if (idx === 0 || (idx + 1) % 5 === 0 || idx === chunks.length - 1) {
        console.log('UPLOAD: embedding chunk', { idx: idx + 1, total: chunks.length, section: chunk.section })
      }
      let embedding: number[]
      try {
        embedding = await embedText(chunk.content)
      } catch (err) {
        throw new Error(
          `Failed to embed CV chunk ${idx + 1}/${chunks.length} (section: ${chunk.section}): ${formatError(err)}`
        )
      }
      const { error } = await supabaseAdmin.from('cv_chunks').insert({
        user_id: userId,
        content: chunk.content,
        section: chunk.section,
        embedding,
      })
      if (error) {
        throw new Error(
          `Failed to insert CV chunk ${idx + 1}/${chunks.length} (section: ${chunk.section}): ${formatError(error)}`
        )
      }
    }

    // Generate CV Rating using Gemini / LLM gateway
    let rating = null
    try {
      console.log('UPLOAD: evaluating resume quality with Gemini…')
      const ratingPrompt = `You are a professional resume writer and recruitment expert. Evaluate the following candidate resume text.
Resume Content:
${rawText.slice(0, 5000)}

Analyze the resume and rate it out of 10 for the following specific criteria:
1. Tone and Style (clarity, professionalism, choice of active verbs)
2. Content (completeness of sections, detail level of accomplishments, impact measurements)
3. Structure (logical grouping, flow, readability)
4. Skills (technical and soft skills mapping, relevancy)

Return ONLY a valid JSON object of the following format, with no surrounding markdown or backticks:
{
  "overall_score": 8.2,
  "criteria": {
    "tone_and_style": 8.0,
    "content": 8.5,
    "structure": 7.5,
    "skills": 9.0
  },
  "feedback": "A concise paragraph summarizing the key strengths and overall impression of the resume.",
  "strengths": [
    "Clear, logical grouping of technical skills.",
    "Strong use of active verbs in the frontend experience section."
  ],
  "improvements": [
    "Quantify your impacts: add specific metrics or numbers to at least 3 job bullets.",
    "Expand on your summary/profile section to clearly state your career goals."
  ]
}
Ready score must be a number between 1.0 and 10.0.`

      const reply = await ollamaChat([
        { role: 'system', content: 'You are an objective resume rating bot. Return ONLY a valid JSON object.' },
        { role: 'user', content: ratingPrompt }
      ], { temperature: 0.2 })

      const jsonMatch = reply.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        rating = JSON.parse(jsonMatch[0])
      }
      
      if (rating) {
        console.log('UPLOAD: saving resume rating to user metadata…')
        const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { cv_rating: rating }
        })
        if (metaError) {
          console.error('UPLOAD: failed to save CV rating to user metadata:', metaError)
        }
      }
    } catch (rateErr) {
      console.error('Failed to generate CV rating:', rateErr)
    }

    return NextResponse.json({
      success: true,
      message: 'CV uploaded',
      chunks: chunks.length,
      rating,
    })
  } catch (err: any) {
    console.error('UPLOAD ERROR:', err)
    const formatted = formatError(err)
    const friendlyMismatch = formatPgvectorDimensionMismatch(formatted)
    const message = friendlyMismatch ?? (err instanceof Error ? err.message : formatted)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
