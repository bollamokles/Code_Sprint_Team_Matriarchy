import { NextRequest, NextResponse } from 'next/server'
import { ollamaChat } from '@/lib/ollama'
import { requireAuthUserId } from '@/lib/require-auth'
import { queryCV, formatCVContext } from '@/lib/rag'

export async function POST(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const { jobTitle, company, jobDescription } = await req.json()
    if (!jobTitle || !company || !jobDescription) {
      return NextResponse.json({ error: 'Missing jobTitle, company, or jobDescription' }, { status: 400 })
    }

    const ragQuery = `${jobTitle} ${company}`
    const cvChunks = await queryCV(userId, ragQuery, 6)
    const ragContext = formatCVContext(cvChunks)

    const systemPrompt =
      `You are a professional cover letter writer. ` +
      `The candidate's CV context is below.\n` +
      `Write a personalized, compelling cover letter for the job described.\n` +
      `Be specific — reference actual skills and experience from the CV context.\n` +
      `Keep it to 3 paragraphs. Do not include placeholders like [Your Name].\n` +
      `CV context: ${ragContext}`

    const letter = await ollamaChat([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Write a cover letter for the role of ${jobTitle} at ${company}.\nJob description: ${jobDescription}`,
      },
    ])

    return NextResponse.json({ letter })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

