import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import type { ApplicationStatus } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch applications
  const { data: applications } = await supabase
    .from('applications')
    .select('status, applied_date, created_at')
    .eq('user_id', user.id)

  // Fetch saved jobs
  const { data: savedJobs, count: savedJobsCount } = await supabase
    .from('saved_jobs')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('fit_score', { ascending: false })

  // Fetch todos
  const { data: todos } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', user.id)
    .order('done', { ascending: true })

  // Fetch skills from cv_chunks to display
  const { data: skillsChunks } = await supabase
    .from('cv_chunks')
    .select('content')
    .eq('user_id', user.id)
    .eq('section', 'skills')

  const parsedSkills = (skillsChunks ?? [])
    .flatMap((s) => String(s.content ?? '').split(/[\n,•|-]/g).map((x) => x.trim()))
    .filter((x) => x.length >= 2)
    .slice(0, 12)

  const hasCV = (skillsChunks ?? []).length > 0

  const mapped =
    applications?.map((a) => ({
      status: a.status as ApplicationStatus,
      created_at: a.applied_date ?? a.created_at,
    })) ?? []

  // Check if skills exist in user metadata
  const userMetadataSkills = user.user_metadata?.skills as string[] | undefined
  const finalSkills = userMetadataSkills?.length ? userMetadataSkills : parsedSkills

  const profile = {
    full_name: (user.user_metadata?.full_name as string) ?? null,
    skills: finalSkills,
    cv_url: hasCV ? 'uploaded_on_file' : null,
  }

  return (
    <DashboardContent
      user={user}
      profile={profile}
      applications={mapped}
      savedJobsCount={savedJobsCount ?? 0}
      savedJobs={savedJobs || []}
      todos={todos || []}
    />
  )
}
