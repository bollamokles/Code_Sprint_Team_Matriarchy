import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UploadContent } from '@/components/upload/upload-content'

export default async function UploadPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const initialRating = user.user_metadata?.cv_rating || null
  const initialSkills = user.user_metadata?.skills || null

  return (
    <UploadContent 
      userId={user.id} 
      profile={{ cv_url: null, skills: initialSkills }} 
      initialRating={initialRating}
    />
  )
}
