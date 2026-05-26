import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { embedText } from '@/lib/embeddings'
import { extractTextFromFile } from '@/lib/cv-parser'
import { chunkCVBySection } from '@/lib/cv-chunker'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('userId') as string | null

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const rawText = await extractTextFromFile(buffer, file.name)
    const chunks = chunkCVBySection(rawText)

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Could not extract text from CV' }, { status: 400 })
    }

    await supabaseAdmin.from('cv_chunks').delete().eq('user_id', userId)

    const sections: Record<string, number> = {}
    for (const chunk of chunks) {
      sections[chunk.section] = (sections[chunk.section] ?? 0) + 1
      const embedding = await embedText(chunk.content)
      const { error } = await supabaseAdmin.from('cv_chunks').insert({
        user_id: userId,
        content: chunk.content,
        section: chunk.section,
        embedding,
      })
      if (error) throw error
    }

    return NextResponse.json({
      success: true,
      chunks: chunks.length,
      sections,
      preview: rawText.slice(0, 300),
    })
  } catch (err) {
    console.error('UPLOAD ERROR:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
