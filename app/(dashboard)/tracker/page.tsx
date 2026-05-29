import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrackerContent } from '@/components/tracker/tracker-content'
import type { Application } from '@/lib/types'

export default async function TrackerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('applications')
    .select(
      'id, user_id, job_title, company, status, applied_date, notes, job_url, salary, location, created_at'
    )
    .eq('user_id', user.id)
    .order('applied_date', { ascending: false })

  const applications = (rows ?? []) as Application[]

  return <TrackerContent userId={user.id} initialApplications={applications} />
}
