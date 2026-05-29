/** Shared UI types aligned with Supabase schema in supabase/schema.sql */

export type ApplicationStatus = 'Applied' | 'Interviewing' | 'Offer' | 'Rejected'

export interface Application {
  id: string
  user_id: string
  job_title: string
  company: string
  status: ApplicationStatus
  applied_date: string
  notes: string | null
  job_url: string | null
  salary: number | null
  location: string | null
  created_at: string
}

export interface JobResult {
  id: string
  title: string
  company: string
  location: string
  description: string
  url: string
  salary_min?: number
  salary_max?: number
  application_deadline?: string | null
  fit_score: number
  fit_reason: string
}

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: 'Applied', label: 'Applied', color: 'bg-info/20 text-info' },
  { value: 'Interviewing', label: 'Interviewing', color: 'bg-primary/20 text-primary' },
  { value: 'Offer', label: 'Offer', color: 'bg-success/20 text-success' },
  { value: 'Rejected', label: 'Rejected', color: 'bg-destructive/20 text-destructive' },
]
