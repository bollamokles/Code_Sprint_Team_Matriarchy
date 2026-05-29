import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/require-auth'
import { queryCV, formatCVContext } from '@/lib/rag'
import { ollamaChat } from '@/lib/ollama'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const { jobTitle, company, jobDescription } = await req.json()

    if (!jobTitle || !jobDescription) {
      return NextResponse.json({ error: 'Missing jobTitle or jobDescription' }, { status: 400 })
    }

    // 1. Fetch CV context using RAG
    const cvChunks = await queryCV(userId, `${jobTitle} ${jobDescription}`, 8)
    const cvContext = formatCVContext(cvChunks)

    // 2. Fetch skills from the chunks to compute overlap programmatically
    const { data: skillsChunks } = await supabaseAdmin
      .from('cv_chunks')
      .select('content')
      .eq('user_id', userId)
      .eq('section', 'skills')
    
    const userSkills = (skillsChunks ?? [])
      .flatMap((s) => String(s.content ?? '').split(/[\n,•|-]/g).map((x) => x.trim()))
      .filter((x) => x.length >= 2)

    // 3. Ask local LLM to do deep comparative gap analysis
    const prompt = `You are a strict technical recruiter. Analyze if the candidate is ready for the following role:
Role: ${jobTitle} at ${company || 'Unknown Company'}
Job Description:
${jobDescription.slice(0, 2000)}

Candidate CV Context:
${cvContext.slice(0, 3000)}

Candidate Listed Skills:
${userSkills.join(', ')}

Return ONLY a valid JSON object of the following format. Ensure no markdown formatting or surrounding backticks:
{
  "ready_score": 82,
  "verdict": "Candidate is highly qualified in core React but lacks sufficient cloud deployment experience for a senior role.",
  "matched_skills": ["React", "TypeScript", "Node.js"],
  "missing_skills": ["AWS", "Docker", "CI/CD"],
  "pros": ["Strong JavaScript programming background", "Proven portfolio of web projects"],
  "cons": ["No production Kubernetes experience", "Limited backend systems scaling portfolio"],
  "recommendations": ["Take a basic AWS Cloud Practitioner course", "Build a microservice project deploying with Docker containerization"]
}
Keep recommendations and reasoning specific and highly practical. Ready score must be 0-100 integer.`

    const reply = await ollamaChat([
      { role: 'system', content: 'You are a precise recruiter. Return ONLY valid raw JSON.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.2 })

    let report = {
      ready_score: 50,
      verdict: 'Unable to analyze qualifications.',
      matched_skills: [] as string[],
      missing_skills: [] as string[],
      pros: [] as string[],
      cons: [] as string[],
      recommendations: [] as string[]
    }

    try {
      const jsonMatch = reply.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        report = JSON.parse(jsonMatch[0])
      }
    } catch (parseErr) {
      console.error('Failed to parse readiness report JSON:', parseErr)
      // Attempt manual fallback based on text
      report.verdict = reply.slice(0, 300)
    }

    // Programmatic verification of skill matches:
    // If the candidate metadata contains matching keywords in JD, inject them programmatically
    const descLower = jobDescription.toLowerCase()
    const programMatches = userSkills.filter(skill => {
      const skillPattern = new RegExp(`\\b${skill.toLowerCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
      return skillPattern.test(descLower)
    })

    // Blend programmatic matches
    report.matched_skills = Array.from(new Set([...(report.matched_skills ?? []), ...programMatches]))
    
    // Adjust readiness score based on manual check if it makes sense
    if (userSkills.length > 0) {
      const programmaticOverlap = Math.round((programMatches.length / Math.min(10, userSkills.length)) * 100)
      report.ready_score = Math.min(100, Math.max(0, Math.round(0.3 * programmaticOverlap + 0.7 * report.ready_score)))
    }

    return NextResponse.json({ report, jobTitle, company })
  } catch (err) {
    console.error('READINESS CHECK ERROR:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
