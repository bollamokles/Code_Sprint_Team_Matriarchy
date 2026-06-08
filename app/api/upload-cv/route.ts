import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { extractTextFromFile } from '@/lib/cv-parser'
import { chunkCVBySection } from '@/lib/cv-chunker'
import OpenAI from 'openai'

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
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey && groqKey !== 'your_groq_key_here' && groqKey.trim() !== '') {
    try {
      const openai = new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
      })
      const response = await openai.embeddings.create({
        model: 'nomic-embed-text',
        input: text,
      })
      if (response.data?.[0]?.embedding) {
        let vector = response.data[0].embedding
        if (vector.length < 768) {
          vector = [...vector, ...new Array(768 - vector.length).fill(0)]
        } else if (vector.length > 768) {
          vector = vector.slice(0, 768)
        }
        return vector
      }
    } catch (error) {
      console.error('Groq embedding API failed, falling back to TF-IDF:', error)
    }
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