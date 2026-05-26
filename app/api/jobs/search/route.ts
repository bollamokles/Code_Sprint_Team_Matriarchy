import { NextRequest, NextResponse } from 'next/server'
import { searchAdzunaJobs } from '@/lib/adzuna'
import { queryCV, formatCVContext } from '@/lib/rag'
import { ollamaChat } from '@/lib/ollama'
import { supabaseAdmin } from '@/lib/supabase'

type ScoredJob = {
  id: string
  title: string
  company: string
  location: string
  description: string
  url: string
  salary_min?: number
  salary_max?: number
  fit_score: number
  fit_reason: string
}

async function scoreJobs(
  cvContext: string,
  jobs: Awaited<ReturnType<typeof searchAdzunaJobs>>
): Promise<ScoredJob[]> {
  const jobSummaries = jobs
    .map(
      (j, i) =>
        `[${i}] ${j.title} at ${j.company} (${j.location})\n${j.description.slice(0, 400)}`
    )
    .join('\n\n')

  const raw = await ollamaChat(
    [
      {
        role: 'system',
        content: `You score job listings against a candidate CV. Return ONLY valid JSON array, no markdown:
[{"index":0,"fit_score":85,"fit_reason":"brief reason"},...]
fit_score is 0-100 integer. Be realistic and specific.`,
      },
      {
        role: 'user',
        content: `CV:\n${cvContext.slice(0, 3000)}\n\nJOBS:\n${jobSummaries}`,
      },
    ],
    { temperature: 0.3 }
  )

  let scores: { index: number; fit_score: number; fit_reason: string }[] = []
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    scores = JSON.parse(jsonMatch?.[0] ?? '[]')
  } catch {
    scores = jobs.map((_, i) => ({
      index: i,
      fit_score: 50,
      fit_reason: 'Could not parse AI score',
    }))
  }

  return jobs.map((job, i) => {
    const score = scores.find((s) => s.index === i) ?? {
      fit_score: 50,
      fit_reason: 'Default score',
    }
    return {
      ...job,
      fit_score: Math.min(100, Math.max(0, Math.round(score.fit_score))),
      fit_reason: score.fit_reason,
    }
  })
}

export async function POST(req: NextRequest) {
  try {
    const { userId, query, location, country } = await req.json()

    if (!userId || !query?.trim()) {
      return NextResponse.json({ error: 'Missing userId or query' }, { status: 400 })
    }

    const cvChunks = await queryCV(userId, query, 8)
    const cvContext = formatCVContext(cvChunks)

    const jobs = await searchAdzunaJobs(
      query.trim(),
      location?.trim() || 'remote',
      country?.trim() || 'us'
    )

    const scored = await scoreJobs(cvContext, jobs)
    scored.sort((a, b) => b.fit_score - a.fit_score)

    for (const job of scored.slice(0, 5)) {
      await supabaseAdmin.from('saved_jobs').insert({
        user_id: userId,
        external_id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        url: job.url,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        fit_score: job.fit_score,
        fit_reason: job.fit_reason,
      })
    }

    return NextResponse.json({ jobs: scored, query: query.trim() })
  } catch (err) {
    console.error('JOB SEARCH ERROR:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
