'use client'

import { useState } from 'react'
import { ExternalLink, Loader2, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useUserId } from '@/hooks/use-user-id'

type Job = {
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

function fitVariant(score: number): 'success' | 'warning' | 'secondary' {
  if (score >= 75) return 'success'
  if (score >= 50) return 'warning'
  return 'secondary'
}

export default function JobsPage() {
  const { userId, ready } = useUserId()
  const [query, setQuery] = useState('software engineer remote')
  const [location, setLocation] = useState('us')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function search() {
    if (!ready || !query.trim()) return
    setLoading(true)
    setError('')
    setJobs([])

    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, query, location, country: 'us' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setJobs(data.jobs ?? [])
    } catch (err) {
      setError(String(err))
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Job Hunter</h1>
        <p className="text-muted-foreground">
          Natural language search via Adzuna, ranked by AI fit score against your CV
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="size-4" />
            Search jobs
          </CardTitle>
          <CardDescription>
            e.g. &quot;React developer fintech&quot; or &quot;entry level data analyst NYC&quot;
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Job query…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="sm:w-32"
          />
          <Button onClick={search} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Search
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base leading-snug">{job.title}</CardTitle>
                  <CardDescription>
                    {job.company} · {job.location}
                  </CardDescription>
                </div>
                <Badge variant={fitVariant(job.fit_score)}>{job.fit_score}% fit</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-3">{job.description}</p>
              <p className="text-sm">
                <span className="font-medium">Why: </span>
                {job.fit_reason}
              </p>
              {(job.salary_min || job.salary_max) && (
                <p className="text-xs text-muted-foreground">
                  Salary: {job.salary_min?.toLocaleString() ?? '?'} –{' '}
                  {job.salary_max?.toLocaleString() ?? '?'}
                </p>
              )}
              {job.url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    View listing
                    <ExternalLink className="size-3" />
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && jobs.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">
          Upload your CV first, then search to see fit-scored job cards.
        </p>
      )}
    </div>
  )
}
