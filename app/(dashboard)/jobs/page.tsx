import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JobHunterContent } from '@/components/jobs/job-hunter-content'

export default async function JobsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <JobHunterContent userId={user.id} />
}
