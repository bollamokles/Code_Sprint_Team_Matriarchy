'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  User,
  Compass,
  FileText,
  Briefcase,
  Users,
  DollarSign,
  Target,
  Award,
  BookOpen,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = { id?: string; role: 'user' | 'assistant'; content: string }

const SUGGESTED_PROMPTS = [
  {
    icon: FileText,
    title: 'Optimize my resume',
    prompt: 'Can you help me optimize my resume for a software engineering position?',
  },
  {
    icon: Briefcase,
    title: 'Interview prep',
    prompt: 'What are the most common interview questions for a product manager role?',
  },
  {
    icon: Users,
    title: 'Networking tips',
    prompt: 'What are the best strategies for networking in tech?',
  },
  {
    icon: DollarSign,
    title: 'Salary negotiation',
    prompt: 'How should I approach salary negotiation when I receive a job offer?',
  },
]

export function AssistantContent({ userId: _userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState('chat')
  
  // Conversational advisor states
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Readiness checker states
  const [readinessTitle, setReadinessTitle] = useState('')
  const [readinessCompany, setReadinessCompany] = useState('')
  const [readinessJD, setReadinessJD] = useState('')
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [readinessError, setReadinessError] = useState('')
  const [readinessReport, setReadinessReport] = useState<any>(null)

  // Roadmap states
  const [roadmapRole, setRoadmapRole] = useState('')
  const [roadmapWeeks, setRoadmapWeeks] = useState('12')
  const [saveToTracker, setSaveToTracker] = useState(true)
  const [roadmapLoading, setRoadmapLoading] = useState(false)
  const [roadmapError, setRoadmapError] = useState('')
  const [roadmapPlan, setRoadmapPlan] = useState<any[] | null>(null)
  const [roadmapSaved, setRoadmapSaved] = useState(false)
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then((d) => {
        if (d.messages) setMessages(d.messages)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, activeTab])

  // Chat actions
  async function sendMessage(text: string) {
    const msg = text.trim()
    if (!msg || loading) return

    setInput('')
    setLoading(true)
    setMessages((m) => [...m, { role: 'user', content: msg }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Chat failed')
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
      setSources(data.sources ?? [])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: err instanceof Error ? err.message : 'Something went wrong.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  // Readiness checker actions
  async function checkReadiness(e: React.FormEvent) {
    e.preventDefault()
    if (!readinessTitle.trim() || !readinessJD.trim() || readinessLoading) return

    setReadinessLoading(true)
    setReadinessError('')
    setReadinessReport(null)

    try {
      const res = await fetch('/api/readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: readinessTitle.trim(),
          company: readinessCompany.trim() || undefined,
          jobDescription: readinessJD.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Readiness evaluation failed')
      setReadinessReport(data.report)
    } catch (err) {
      setReadinessError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setReadinessLoading(false)
    }
  }

  // Roadmap actions
  async function generateRoadmap(e: React.FormEvent) {
    e.preventDefault()
    if (!roadmapRole.trim() || roadmapLoading) return

    setRoadmapLoading(true)
    setRoadmapError('')
    setRoadmapPlan(null)
    setRoadmapSaved(false)

    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: roadmapRole.trim(),
          durationWeeks: parseInt(roadmapWeeks, 10),
          saveToTracker: saveToTracker,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Roadmap generation failed')
      setRoadmapPlan(data.roadmap)
      setRoadmapSaved(data.savedToTracker)
      if (data.roadmap?.length > 0) {
        setExpandedWeek(1)
      }
    } catch (err) {
      setRoadmapError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setRoadmapLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Header Section */}
      <div className="p-6 lg:p-8 pb-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Career Assistant</h1>
            <p className="text-muted-foreground text-sm">Grounded in your CV, actively coaching your career path</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-6 lg:px-8 border-b bg-muted/20 flex-shrink-0">
          <TabsList className="h-12 bg-transparent gap-2 p-0">
            <TabsTrigger value="chat" className="h-12 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4">
              <MessageSquare className="w-4 h-4 mr-2" />
              Advisor Chat
            </TabsTrigger>
            <TabsTrigger value="readiness" className="h-12 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4">
              <Target className="w-4 h-4 mr-2" />
              Readiness Scorecard
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="h-12 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4">
              <Award className="w-4 h-4 mr-2" />
              Learning Roadmap
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Classic chat advisor */}
        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 focus-visible:outline-none">
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 scrollbar-thin">
            {sources.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center bg-primary/5 p-3 rounded-xl border border-primary/10">
                <span className="text-xs font-semibold text-primary mr-1">RAG Grounded Sections:</span>
                {sources.map((s, i) => (
                  <Badge key={`${s}-${i}`} variant="secondary" className="text-xs uppercase bg-background font-mono">
                    {s}
                  </Badge>
                ))}
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center py-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
                  <Compass className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">How can I guide your career today?</h2>
                <p className="text-muted-foreground mb-8 max-w-md">
                  Ask me about resume upgrades, interview questions, or strategic networking.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 w-full max-w-lg">
                  {SUGGESTED_PROMPTS.map((prompt, index) => {
                    const Icon = prompt.icon
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => void sendMessage(prompt.prompt)}
                        className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/50 text-left transition-all group shadow-sm"
                      >
                        <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                          <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <span className="font-semibold text-sm">{prompt.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((message, idx) => {
                  const isUser = message.role === 'user'
                  return (
                    <div
                      key={message.id ?? idx}
                      className={cn('flex gap-4', isUser ? 'justify-end' : '')}
                    >
                      {!isUser && (
                        <Avatar className="w-9 h-9 flex-shrink-0 bg-gradient-to-br from-primary to-accent">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                            CP
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-3 max-w-[80%] leading-relaxed shadow-sm text-sm whitespace-pre-wrap',
                          isUser ? 'bg-primary text-primary-foreground font-medium rounded-tr-none' : 'bg-muted rounded-tl-none border'
                        )}
                      >
                        {message.content}
                      </div>
                      {isUser && (
                        <Avatar className="w-9 h-9 flex-shrink-0 bg-primary">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )
                })}
                {loading && (
                  <div className="flex gap-4">
                    <Avatar className="w-9 h-9 bg-gradient-to-br from-primary to-accent flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                        <Sparkles className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl px-4 py-3 bg-muted rounded-tl-none border">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Synthesizing CV profile...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="p-4 lg:p-6 border-t bg-background flex-shrink-0">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="relative flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about your career path..."
                  disabled={loading}
                  rows={1}
                  className="min-h-[52px] max-h-[150px] resize-none py-3.5 text-base flex-1 shadow-inner focus-visible:ring-primary/20"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-[52px] w-[52px] rounded-xl shadow-lg shadow-primary/25 flex-shrink-0"
                  disabled={!input.trim() || loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        {/* Tab 2: Readiness Scorecard */}
        <TabsContent value="readiness" className="flex-1 overflow-y-auto p-6 lg:p-8 focus-visible:outline-none min-h-0 scrollbar-thin">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Target className="w-5 h-5 text-primary" />
                  Job Readiness Scorer
                </CardTitle>
                <CardDescription>
                  Paste the requirements of the job you want. We will compute your programmatic match score and list exact skill gaps.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={checkReadiness} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jd-title">Job Title *</Label>
                      <Input
                        id="jd-title"
                        placeholder="e.g. Senior Frontend Engineer"
                        value={readinessTitle}
                        onChange={(e) => setReadinessTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jd-company">Company</Label>
                      <Input
                        id="jd-company"
                        placeholder="e.g. Google"
                        value={readinessCompany}
                        onChange={(e) => setReadinessCompany(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jd-text">Job Description / Requirements *</Label>
                    <Textarea
                      id="jd-text"
                      placeholder="Paste the full job requirements or posting here..."
                      rows={6}
                      value={readinessJD}
                      onChange={(e) => setReadinessJD(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 shadow-md shadow-primary/25" disabled={readinessLoading}>
                    {readinessLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running Programmatic Match Scoring...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Evaluate My Readiness
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {readinessError && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {readinessError}
              </div>
            )}

            {readinessReport && (
              <div className="space-y-6">
                {/* Visual scorecard stats */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="md:col-span-1 flex flex-col justify-center items-center p-6 text-center border-primary/20">
                    <CardHeader className="p-0 mb-2">
                      <CardTitle className="text-sm font-semibold text-muted-foreground">Readiness Index</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex flex-col items-center">
                      <div className="relative flex items-center justify-center w-28 h-28 rounded-full border-4 border-muted">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl font-extrabold text-primary">{readinessReport.ready_score}%</span>
                        </div>
                        {/* Circular ring progression */}
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="56"
                            cy="56"
                            r="50"
                            className="stroke-primary fill-none"
                            strokeWidth="6"
                            strokeDasharray={2 * Math.PI * 50}
                            strokeDashoffset={2 * Math.PI * 50 * (1 - readinessReport.ready_score / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <Badge className="mt-4 font-bold" variant={readinessReport.ready_score >= 70 ? 'default' : 'secondary'}>
                        {readinessReport.ready_score >= 70 ? 'Role Ready' : 'Development Required'}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2 p-6 border-primary/10">
                    <CardHeader className="p-0 mb-3">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" />
                        AI Verdict & Reasoning
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line bg-muted/40 p-4 rounded-xl border border-dashed">
                        {readinessReport.verdict}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Skill Overlap Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Skills Overlap Breakdown</CardTitle>
                    <CardDescription>Visual comparison of matching credentials and identified missing gaps</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-success flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Matched Credentials ({readinessReport.matched_skills?.length || 0})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {readinessReport.matched_skills && readinessReport.matched_skills.length > 0 ? (
                          readinessReport.matched_skills.map((s: string) => (
                            <Badge key={s} variant="outline" className="border-success/30 bg-success/5 text-success font-semibold px-2.5 py-1">
                              {s}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No overlapping skills matching the JD.</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-destructive flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        Skills Gap ({readinessReport.missing_skills?.length || 0})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {readinessReport.missing_skills && readinessReport.missing_skills.length > 0 ? (
                          readinessReport.missing_skills.map((s: string) => (
                            <Badge key={s} variant="outline" className="border-destructive/30 bg-destructive/5 text-destructive font-semibold px-2.5 py-1">
                              {s}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No skill gaps identified! Great fit!</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pros and Cons highlights */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold flex items-center gap-2 text-success">
                        <Check className="w-4 h-4" />
                        Key Advantages
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {readinessReport.pros?.map((pro: string, i: number) => (
                        <div key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                          <span className="text-success font-bold">•</span>
                          <span>{pro}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold flex items-center gap-2 text-warning">
                        <AlertCircle className="w-4 h-4" />
                        Identified Friction Points
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {readinessReport.cons?.map((con: string, i: number) => (
                        <div key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                          <span className="text-warning font-bold">•</span>
                          <span>{con}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Actionable recommendations */}
                <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Advisor Roadmap Recommendations
                    </CardTitle>
                    <CardDescription>Steps you should take immediately to bridge the skill gaps</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {readinessReport.recommendations?.map((rec: string, i: number) => (
                      <div key={i} className="flex gap-3 text-sm text-foreground bg-background p-3 rounded-xl border border-primary/10 shadow-sm">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className="leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Roadmap Planner */}
        <TabsContent value="roadmap" className="flex-1 overflow-y-auto p-6 lg:p-8 focus-visible:outline-none min-h-0 scrollbar-thin">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Award className="w-5 h-5 text-primary" />
                  Learning Roadmap Generator
                </CardTitle>
                <CardDescription>
                  Transitioning into a new role? Let the agent analyze your CV gaps and compile a structured week-by-week checklist.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={generateRoadmap} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-2">
                      <Label htmlFor="road-role">Target Career Role *</Label>
                      <Input
                        id="road-role"
                        placeholder="e.g. Data Engineer, DevOps Engineer"
                        value={roadmapRole}
                        onChange={(e) => setRoadmapRole(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="road-duration">Roadmap Duration</Label>
                      <Select value={roadmapWeeks} onValueChange={setRoadmapWeeks}>
                        <SelectTrigger id="road-duration">
                          <SelectValue placeholder="Duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 Weeks (1 Month)</SelectItem>
                          <SelectItem value="8">8 Weeks (2 Months)</SelectItem>
                          <SelectItem value="12">12 Weeks (3 Months)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-muted/40 rounded-lg border border-dashed">
                    <input
                      id="save-tracker"
                      type="checkbox"
                      checked={saveToTracker}
                      onChange={(e) => setSaveToTracker(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <Label htmlFor="save-tracker" className="text-sm font-semibold cursor-pointer select-none">
                      Automatically sync weekly milestones into my Daily To-Do Tracker!
                    </Label>
                  </div>
                  <Button type="submit" className="w-full h-11 shadow-md shadow-primary/25" disabled={roadmapLoading}>
                    {roadmapLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Agent is chunking CV gaps & building resources...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Build My Learning Roadmap
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {roadmapError && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {roadmapError}
              </div>
            )}

            {roadmapPlan && (
              <div className="space-y-6">
                {roadmapSaved && (
                  <div className="p-4 rounded-xl bg-success/15 border border-success/30 text-success text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 animate-bounce" />
                    <div>
                      <span className="font-bold">Sync Completed!</span> Milestones successfully pushed to your <span className="font-bold underline">Daily To-Do List</span>. Tasks will appear scheduled week by week from today.
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Weekly Roadmap Plan: {roadmapRole}
                  </h3>

                  {/* Vertical interactive timeline */}
                  <div className="relative pl-6 border-l-2 border-primary/20 space-y-4 ml-3">
                    {roadmapPlan.map((item) => {
                      const isExpanded = expandedWeek === item.week
                      return (
                        <div key={item.week} className="relative">
                          {/* Timeline node dot */}
                          <div className={cn(
                            "absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center transition-colors",
                            isExpanded ? "bg-primary" : "bg-background"
                          )} />

                          <Card className="hover:border-primary/30 transition-all shadow-sm">
                            <button
                              type="button"
                              onClick={() => setExpandedWeek(isExpanded ? null : item.week)}
                              className="w-full flex items-center justify-between p-4 font-semibold text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                  Week {item.week}
                                </span>
                                <span className="text-sm sm:text-base text-foreground font-bold line-clamp-1">{item.title}</span>
                              </div>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {isExpanded && (
                              <CardContent className="pt-0 pb-4 px-4 space-y-4 border-t border-dashed mt-2 pt-4">
                                <div className="space-y-2">
                                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-primary">Core learning topics:</h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {item.topics?.map((topic: string) => (
                                      <Badge key={topic} variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                                        {topic}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-accent flex items-center gap-1">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    Curated learning resources:
                                  </h4>
                                  <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground leading-relaxed">
                                    {item.resources?.map((res: string, idx: number) => (
                                      <li key={idx} className="marker:text-primary">
                                        {res}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
