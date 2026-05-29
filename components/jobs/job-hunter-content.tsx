'use client'

import { useState } from 'react'
import type { JobResult } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  MapPin, 
  Building2, 
  DollarSign, 
  Clock, 
  Bookmark, 
  BookmarkCheck,
  ExternalLink,
  Plus,
  Briefcase,
  Filter,
  X,
  Loader2
} from 'lucide-react'
import { FileText, Sparkles } from 'lucide-react'

interface JobHunterContentProps {
  userId: string
}

function fitBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 80) return 'default'
  if (score >= 50) return 'secondary'
  return 'destructive'
}

export function JobHunterContent({ userId: _userId }: JobHunterContentProps) {
  const [searchQuery, setSearchQuery] = useState('Find me ML internships in Dhaka open this month')
  const [jobs, setJobs] = useState<JobResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [parsedParams, setParsedParams] = useState<{ keywords: string; location: string; country: string } | null>(null)
  const [coverOpen, setCoverOpen] = useState(false)
  const [coverJob, setCoverJob] = useState<JobResult | null>(null)
  const [coverLoading, setCoverLoading] = useState(false)
  const [coverText, setCoverText] = useState('')
  const [coverError, setCoverError] = useState('')

  async function runSearch() {
    if (!searchQuery.trim()) return
    setLoading(true)
    setError('')
    setJobs([])
    setParsedParams(null)
    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Search failed')
      setJobs(data.jobs ?? [])
      if (data.parsed_params) {
        setParsedParams(data.parsed_params)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  async function openCoverLetter(job: JobResult) {
    setCoverJob(job)
    setCoverOpen(true)
    setCoverLoading(true)
    setCoverError('')
    setCoverText('')
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate cover letter')
      setCoverText(data.letter ?? '')
    } catch (err) {
      setCoverError(String(err))
    } finally {
      setCoverLoading(false)
    }
  }

  const filteredJobs = jobs

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Search className="w-8 h-8 text-primary" />
            Job Hunter Agent
          </h1>
          <p className="text-muted-foreground mt-1">
            Let the agent hunt and grade jobs grounded in your CV
          </p>
        </div>
        
        <Button className="shadow-lg shadow-primary/25 h-12 px-6" onClick={() => void runSearch()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Hunt Jobs with AI
        </Button>
      </div>

      {/* Search Input */}
      <Card className="border-primary/10 shadow-md">
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Ask in natural language e.g. 'Find me ML internships in Dhaka open this month'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
                className="pl-10 h-12 text-base"
                disabled={loading}
              />
            </div>
            <Button size="lg" className="h-12 px-8" onClick={() => void runSearch()} disabled={loading}>
              Hunt
            </Button>
          </div>

          {parsedParams && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs sm:text-sm text-primary">
              <Sparkles className="w-4 h-4 flex-shrink-0 animate-pulse" />
              <div>
                <span className="font-semibold">Agent Search Interpretation:</span> Search Query: <code className="px-1.5 py-0.5 bg-background border rounded font-mono text-xs">{parsedParams.keywords}</code> | Location: <code className="px-1.5 py-0.5 bg-background border rounded font-mono text-xs">{parsedParams.location}</code> | Country: <code className="px-1.5 py-0.5 bg-background border rounded font-mono text-xs">{parsedParams.country.toUpperCase()}</code>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Job Listings */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          Job Listings ({filteredJobs.length})
        </h2>
        
        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div>
                <p className="font-semibold text-base">Agent is hunting, reading CV, and grading matching scores...</p>
                <p className="text-xs text-muted-foreground mt-1">This will take a few seconds as the agent computes programmatic overlaps and queries local LLM</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No jobs found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Try asking in natural language e.g. "Find me remote web developer internships"
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job) => (
                <Card key={job.id} className="hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div className="space-y-1.5">
                          <div>
                            <h3 className="font-semibold text-lg hover:text-primary transition-colors">{job.title}</h3>
                            <p className="text-muted-foreground text-sm font-medium">{job.company}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <MapPin className="w-3.5 h-3.5" />
                              {job.location}
                            </Badge>
                            <Badge variant={fitBadgeVariant(job.fit_score)} className="font-bold">
                              {job.fit_score}% match
                            </Badge>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg border text-xs text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                            <span className="font-semibold text-foreground flex items-center gap-1 mb-1">
                              <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                              Agent Matching Reason:
                            </span>
                            {job.fit_reason}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 md:flex-col flex-shrink-0 w-full md:w-auto">
                        <Button size="sm" variant="outline" className="flex-1 md:flex-none" onClick={() => void openCoverLetter(job)}>
                          <FileText className="w-4 h-4 mr-2" />
                          Cover letter
                        </Button>
                        <Button size="sm" className="flex-1 md:flex-none shadow-sm shadow-primary/25" asChild>
                          <a href={job.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Apply
                          </a>
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{job.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      <Dialog open={coverOpen} onOpenChange={setCoverOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cover letter — {coverJob?.title}</DialogTitle>
            <DialogDescription>{coverJob?.company}</DialogDescription>
          </DialogHeader>
          {coverLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : coverError ? (
            <p className="text-sm text-destructive">{coverError}</p>
          ) : (
            <Textarea readOnly value={coverText} rows={14} className="font-mono text-sm" />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => coverText && navigator.clipboard.writeText(coverText)}
              disabled={!coverText}
            >
              Copy to clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
