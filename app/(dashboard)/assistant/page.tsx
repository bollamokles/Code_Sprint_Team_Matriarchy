import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssistantContent } from '@/components/assistant/assistant-content'

export default async function AssistantPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return <AssistantContent userId={user.id} />
}
