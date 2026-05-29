import { NextRequest, NextResponse } from 'next/server'
import { searchAdzunaJobs } from '@/lib/adzuna'
import { requireAuthUserId } from '@/lib/require-auth'
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

// LLM query parser to handle natural language job search queries
async function parseNLQuery(rawQuery: string): Promise<{ keywords: string; location: string; country: string }> {
  try {
    const prompt = `You are a search query parser for a job board. Parse the following natural language query into a JSON object:
{
  "keywords": "job title or skills to search for (keep it short, max 3-4 words)",
  "location": "city or 'remote' (e.g. 'Dhaka', 'London', 'San Francisco')",
  "country": "two-letter ISO country code (e.g. 'us', 'gb', 'bd', 'ca', 'in'). Default to 'us' if not specified or unclear. If Dhaka or Bangladesh is specified, use 'bd'."
}
Query: "${rawQuery}"
Return ONLY the raw JSON object, no markdown, no explanation, no backticks. Make sure the JSON is valid.`

    const reply = await ollamaChat([
      { role: 'system', content: 'You are a precise JSON extractor. Return ONLY valid raw JSON.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.1 })

    const jsonMatch = reply.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        keywords: parsed.keywords || rawQuery,
        location: parsed.location || 'remote',
        country: parsed.country || 'us'
      }
    }
  } catch (err) {
    console.error('NL Query parsing error, falling back:', err)
  }

  // Fallback if parser fails
  return {
    keywords: rawQuery,
    location: 'remote',
    country: 'us'
  }
}

// Programmatic skill overlap scoring
function computeProgrammaticOverlap(userSkills: string[], jobDescription: string): number {
  if (!userSkills || userSkills.length === 0) return 50 // Default neutral score if no skills on file

  const descLower = jobDescription.toLowerCase()
  let matchedCount = 0

  userSkills.forEach(skill => {
    const skillPattern = new RegExp(`\\b${skill.toLowerCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
    if (skillPattern.test(descLower) || descLower.includes(skill.toLowerCase())) {
      matchedCount++
    }
  })

  return Math.round((matchedCount / userSkills.length) * 100)
}

async function scoreJobs(
  cvContext: string,
  userSkills: string[],
  jobs: Awaited<ReturnType<typeof searchAdzunaJobs>>
): Promise<ScoredJob[]> {
  if (jobs.length === 0) return []

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

  let llmScores: { index: number; fit_score: number; fit_reason: string }[] = []
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    llmScores = JSON.parse(jsonMatch?.[0] ?? '[]')
  } catch {
    llmScores = jobs.map((_, i) => ({
      index: i,
      fit_score: 50,
      fit_reason: 'Could not parse AI score',
    }))
  }

  return jobs.map((job, i) => {
    const llmScoreObj = llmScores.find((s) => s.index === i) ?? {
      fit_score: 50,
      fit_reason: 'Default score',
    }
    
    // Compute programmatic skill overlap score (30% weight)
    const programmaticScore = computeProgrammaticOverlap(userSkills, job.description)
    
    // Combine with semantic LLM score (70% weight)
    const hybridScore = Math.min(100, Math.max(0, Math.round(0.3 * programmaticScore + 0.7 * llmScoreObj.fit_score)))

    return {
      ...job,
      fit_score: hybridScore,
      fit_reason: `${llmScoreObj.fit_reason} (Skill match: ${programmaticScore}%, Semantic fit: ${llmScoreObj.fit_score}%)`,
    }
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const { query } = await req.json()

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 })
    }

    // 1. Parse natural language query into Adzuna filters using AI
    console.log('JOBS: Parsing NL query:', query)
    const parsed = await parseNLQuery(query.trim())
    console.log('JOBS: Parsed query parameters:', parsed)

    // 2. Fetch CV chunks for RAG matching
    const cvChunks = await queryCV(userId, parsed.keywords, 8)
    const cvContext = formatCVContext(cvChunks)

    // 3. Fetch skills from the RAG store to use for programmatic scoring
    const { data: skillsChunks } = await supabaseAdmin
      .from('cv_chunks')
      .select('content')
      .eq('user_id', userId)
      .eq('section', 'skills')
    
    const userSkills = (skillsChunks ?? [])
      .flatMap((s) => String(s.content ?? '').split(/[\n,•|-]/g).map((x) => x.trim()))
      .filter((x) => x.length >= 2)

    // 4. Fetch jobs from external Adzuna API
    const jobs = await searchAdzunaJobs(
      parsed.keywords,
      parsed.location,
      parsed.country
    )

    // 5. Score jobs using hybrid programmatic + semantic fit scorer
    const scored = await scoreJobs(cvContext, userSkills, jobs)
    scored.sort((a, b) => b.fit_score - a.fit_score)

    // 6. Save top scored jobs in database for quick retrieval/bookmarks
    for (const job of scored.slice(0, 5)) {
      await supabaseAdmin.from('saved_jobs').upsert({
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
      }, { onConflict: 'user_id,external_id' })
    }

    return NextResponse.json({ 
      jobs: scored, 
      query: query.trim(),
      parsed_params: parsed
    })
  } catch (err) {
    console.error('JOB SEARCH ERROR:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
