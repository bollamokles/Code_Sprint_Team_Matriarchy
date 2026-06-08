import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { extractTextFromFile } from '@/lib/cv-parser'
import { chunkCVBySection } from '@/lib/cv-chunker'

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try { return JSON.stringify(err) } catch { return String(err) }
}

function tfidfVector(text: string): number[] {
  const words = text.toLowerCase().match(/\b\w+\b/g) || []
  const freq: Record<string, number> = {}
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })
  const vec = new Array(768).fill(0)
  Object.entries(freq).forEach(([_, count], i) => {
    vec[i % 768] += count / Math.max(words.length, 1)
  })
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  return vec.map(v => v / mag)
}

async function getEmbedding(text: string): Promise<number[]> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL
  if (ollamaUrl && !process.env.VERCEL) {
    try {
      const res = await fetch(`${ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text', prompt: text }),
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.embedding?.length) return data.embedding
      }
    } catch {}
  }
  return tfidfVector(text)
}

export async function POST(req: NextRequest) {
  console.log('POST /api/upload-cv: started')
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const userId = (formData.get('userId') as string) ||
                   process.env.NEXT_PUBLIC_DEMO_USER_ID ||
                   'Rafi_vai_shera'

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    const rawBinary = new Uint8Array(await file.arrayBuffer())
    console.log('UPLOAD: extracting text...', { fileName: file.name, userId })

    const rawText = await extractTextFromFile(rawBinary, file.name)
    console.log('UPLOAD: extracted text chars', rawText?.length ?? 0)

    const chunks = chunkCVBySection(rawText)
    console.log('UPLOAD: chunked', chunks.length)

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Could not extract text from CV' }, { status: 400 })
    }

    await supabaseAdmin.from('cv_chunks').delete().eq('user_id', userId)

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx]
      const embedding = await getEmbedding(chunk.content)

      const { error } = await supabaseAdmin.from('cv_chunks').insert({
        user_id: userId,
        content: chunk.content,
        section: chunk.section,
        embedding,
      })

      if (error) {
        return NextResponse.json(
          { error: `Failed to insert chunk ${idx + 1}: ${formatError(error)}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'CV uploaded successfully',
      chunks: chunks.length,
      rating: null,
    })

  } catch (err: any) {
    console.error('UPLOAD ERROR:', err)
    return NextResponse.json({ error: formatError(err) }, { status: 500 })
  }
}