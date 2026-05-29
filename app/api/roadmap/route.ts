import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/require-auth'
import { queryCV, formatCVContext } from '@/lib/rag'
import { ollamaChat } from '@/lib/ollama'
import { supabaseAdmin } from '@/lib/supabase'

type RoadmapWeek = {
  week: number
  title: string
  topics: string[]
  resources: string[]
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const { targetRole, durationWeeks, saveToTracker } = await req.json()

    if (!targetRole) {
      return NextResponse.json({ error: 'Missing targetRole' }, { status: 400 })
    }

    const weeks = Number(durationWeeks) || 12 // Default to 12 weeks / 3 months

    // 1. Fetch CV context using RAG
    const cvChunks = await queryCV(userId, targetRole, 6)
    const cvContext = formatCVContext(cvChunks)

    // 2. Query LLM to generate customized roadmap
    const prompt = `You are a professional technical career advisor. Build a highly customized weekly roadmap for the candidate to transition into the target role.
Target Role: ${targetRole}
Roadmap Duration: ${weeks} weeks

Candidate CV Context:
${cvContext.slice(0, 3000)}

Design a weekly roadmap that targets the specific gaps identified between their CV and the target role requirements.
Return ONLY a valid JSON array of weekly milestones. Ensure no markdown formatting or surrounding backticks:
[
  {
    "week": 1,
    "title": "Mastering Advanced TypeScript",
    "topics": ["Generics", "Conditional Types", "Discriminated Unions"],
    "resources": ["Official TypeScript Handbooks", "Jack Herrington YouTube Tutorials"]
  },
  {
    "week": 2,
    "title": "Docker Containers & Orchestration Basics",
    "topics": ["Writing Dockerfiles", "Multi-stage builds", "Docker Compose"],
    "resources": ["Docker official getting started docs", "TechWorld with Nana Docker course"]
  }
]
Adjust the week numbers from 1 to ${weeks}. Ensure the output strictly conforms to valid JSON format.`

    const reply = await ollamaChat([
      { role: 'system', content: 'You are a precise technical advisor. Return ONLY valid raw JSON array.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.3 })

    let roadmap: RoadmapWeek[] = []
    try {
      const jsonMatch = reply.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        roadmap = JSON.parse(jsonMatch[0])
      }
    } catch (parseErr) {
      console.error('Failed to parse roadmap JSON:', parseErr)
      // Throw error to retry/alert
      return NextResponse.json({ error: 'Could not parse generated roadmap structure. Please try again.' }, { status: 500 })
    }

    // 3. Save roadmap to To-Dos if requested
    if (saveToTracker && roadmap.length > 0) {
      const today = new Date()
      const insertRows = roadmap.map((item) => {
        // Calculate due date based on week offset
        const dueDate = new Date()
        dueDate.setDate(today.getDate() + (item.week * 7))
        
        return {
          user_id: userId,
          text: `[Roadmap - Week ${item.week}] ${item.title}: Study ${item.topics.slice(0, 2).join(', ')}`,
          due_date: dueDate.toISOString().slice(0, 10),
          done: false,
        }
      })

      const { error } = await supabaseAdmin
        .from('todos')
        .insert(insertRows)

      if (error) {
        console.error('Failed to auto-save roadmap to todos:', error)
      }
    }

    return NextResponse.json({ roadmap, targetRole, durationWeeks: weeks, savedToTracker: !!saveToTracker })
  } catch (err) {
    console.error('ROADMAP GENERATION ERROR:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
