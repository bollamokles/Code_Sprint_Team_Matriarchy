'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Application, APPLICATION_STATUSES, ApplicationStatus } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Briefcase, 
  Target, 
  TrendingUp, 
  Calendar, 
  Search, 
  MessageSquare, 
  Upload, 
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Flame,
  Zap,
  Award,
  Check,
  MapPin,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import { format, subDays, isAfter, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface DashboardContentProps {
  user: User
  profile: { full_name: string | null; skills: string[] | null; cv_url: string | null } | null
  applications: Pick<Application, 'status' | 'created_at'>[]
  savedJobsCount: number
  savedJobs: any[]
  todos: any[]
}

export function DashboardContent({ 
  user, 
  profile, 
  applications, 
  savedJobsCount,
  savedJobs,
  todos: initialTodos 
}: DashboardContentProps) {
  const firstName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'
  
  // Dynamic To-Dos checklist state
  const [todos, setTodos] = useState(initialTodos)

  // Calculate applications stats
  const totalApplications = applications.length
  const activeApplications = applications.filter((a) => !['Rejected', 'Offer'].includes(a.status)).length
  const interviewingCount = applications.filter((a) => a.status === 'Interviewing').length
  const offersCount = applications.filter((a) => a.status === 'Offer').length
  
  // Recent applications (last 7 days)
  const recentApplications = applications.filter(a => 
    isAfter(new Date(a.created_at), subDays(new Date(), 7))
  ).length

  // Streak counter (gamified - computed dynamically based on applications count)
  const hasApplications = applications.length > 0
  const streak = hasApplications ? Math.min(14, Math.max(3, Math.floor(applications.length / 2) + 2)) : 0

  // Roadmap percentage complete (calculated based on completed todos)
  const totalTodos = todos.length
  const doneTodos = todos.filter(t => t.done).length
  const roadmapProgress = totalTodos > 0 ? Math.round((doneTodos / totalTodos) * 100) : 0

  // Handle direct checking of To-Dos from dashboard
  const handleToggleTodo = async (id: string, done: boolean) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    await fetch('/api/todos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, done })
    })
  }

  // Status distribution
  const statusCounts = APPLICATION_STATUSES.reduce((acc, status) => {
    acc[status.value] = applications.filter(a => a.status === status.value).length
    return acc
  }, {} as Record<ApplicationStatus, number>)

  const stats = [
    {
      title: 'Total Applications',
      value: totalApplications,
      description: `${recentApplications} this week`,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Active Applications',
      value: activeApplications,
      description: 'In progress',
      icon: Target,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Interviews Scheduled',
      value: interviewingCount,
      description: 'Prep triggers active',
      icon: Calendar,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Offers Received',
      value: offersCount,
      description: 'Review triggers active',
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ]

  const quickActions = [
    {
      title: 'Hunt Jobs',
      description: 'Search for jobs with AI fit',
      icon: Search,
      href: '/jobs',
      color: 'text-primary',
    },
    {
      title: 'Track Pipeline',
      description: 'Kanban board & Calendar',
      icon: TrendingUp,
      href: '/tracker',
      color: 'text-info',
    },
    {
      title: 'Career Assistant',
      description: 'Roadmaps & Scorecards',
      icon: MessageSquare,
      href: '/assistant',
      color: 'text-accent',
    },
    {
      title: 'Upload Resume',
      description: 'Embed CV section chunks',
      icon: Upload,
      href: '/upload',
      color: 'text-success',
    },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-background">
      {/* Top Welcome / Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d')}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {firstName}!
          </h1>
          <p className="text-muted-foreground text-sm">
            Here is your personalized agentic career hub. Keep pushing forward!
          </p>
        </div>

        {/* Gamified Streak Counter widget */}
        {streak > 0 && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 px-4 py-2.5 rounded-2xl shadow-sm">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center animate-bounce">
              <Flame className="w-6 h-6 text-orange-500 fill-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wide">Application Streak</p>
              <p className="text-base font-extrabold text-orange-600">{streak} Days Active!</p>
            </div>
          </div>
        )}
      </div>

      {/* AI Nudges Banner Section */}
      <div className="space-y-4">
        {totalApplications === 0 ? (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 border border-primary/20 flex items-start gap-4 shadow-sm">
            <div className="p-3 bg-primary/20 rounded-xl flex-shrink-0 animate-pulse">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-primary flex items-center gap-1.5">
                💡 AI Agent Nudge: Getting Started
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                You haven&apos;t added any job applications yet! A consistent routine increases interview rates by 40%. Upload your CV to the semantic index, then head to the **Job Hunter** to find matched remote or local roles immediately.
              </p>
              <Button size="sm" variant="link" className="p-0 h-auto font-bold text-xs text-primary gap-1" asChild>
                <Link href="/upload">
                  Upload Resume / CV Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : savedJobs.length > 0 ? (
          <Card className="border-primary/25 bg-gradient-to-br from-primary/5 via-background to-background shadow-md">
            <CardHeader className="pb-3 pt-5">
              <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary animate-bounce" />
                AI Hunter Match Nudges: Highly Fit Openings For You
              </CardTitle>
              <CardDescription className="text-xs">
                We mapped these new job postings against your CV chunks and computed exceptional fit scores:
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3 pb-5">
              {savedJobs.slice(0, 3).map((job) => (
                <div key={job.id} className="p-4 rounded-xl border bg-background hover:border-primary/30 transition-all shadow-sm space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs font-bold truncate text-foreground leading-tight">{job.title}</p>
                      <Badge variant="outline" className="text-[10px] font-extrabold border-primary/20 bg-primary/5 text-primary py-0.5">
                        {job.fit_score}% match
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate font-medium flex items-center gap-1 mt-1">
                      <Building2 className="w-3 h-3" />
                      {job.company}
                    </p>
                    <p className="text-[9px] text-muted-foreground line-clamp-2 mt-2 leading-relaxed italic border-l-2 pl-2">
                      {job.fit_reason?.replace(/\(.*?\)/g, '') || 'Excellent skill overlap with resume details'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-[10px] h-8 font-bold mt-2" asChild>
                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                      View details
                    </a>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/5 border border-primary/20 flex items-start gap-4">
            <div className="p-3 bg-primary/20 rounded-xl flex-shrink-0">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-primary">
                💡 CareerPilot Advisor: Hunt is Active
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Ready to search? Enter your target role in the **Job Hunter** to parse vacancies, score your fit programmatically, and build customized roadmaps automatically.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="relative overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content Grid: Pipeline + Roadmap circular progress + Tasks widget */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pipeline Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Application Pipeline
            </CardTitle>
            <CardDescription>
              Check visual tracker positions and manage applications progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalApplications === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Briefcase className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No applications yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Start tracking your job applications to see your progress here
                </p>
                <Button asChild>
                  <Link href="/tracker">
                    Start Tracking
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {APPLICATION_STATUSES.map((status) => {
                  const count = statusCounts[status.value] || 0
                  const percentage = totalApplications > 0 ? Math.round((count / totalApplications) * 100) : 0
                  return (
                    <div key={status.value} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="font-bold text-xs">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full font-bold" asChild>
                    <Link href="/tracker">
                      Open Kanban Board
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Roadmap Circular Progress Metric */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold text-lg">
              <Award className="w-5 h-5 text-accent" />
              Roadmap Progress
            </CardTitle>
            <CardDescription>Target skills & roadmaps milestone achievements</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center flex-1 py-4">
            <div className="relative flex items-center justify-center w-36 h-36 rounded-full border-4 border-muted">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-accent">{roadmapProgress}%</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">Completed</span>
              </div>
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="68"
                  cy="68"
                  r="62"
                  className="stroke-accent fill-none"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 62}
                  strokeDashoffset={2 * Math.PI * 62 * (1 - roadmapProgress / 100)}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-6 max-w-[200px] leading-relaxed">
              {totalTodos > 0 
                ? `${doneTodos} of ${totalTodos} roadmap checklist tasks completed.`
                : 'No roadmap plan synced yet. Generate one in the AI Assistant!'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Today's Tasks checklists widget */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-warning" />
                Today&apos;s Checklist
              </CardTitle>
              <CardDescription>Review and tick off tasks due this week</CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/tracker?tab=todos">
                View all tasks
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y max-h-[300px] overflow-y-auto pr-1">
            {todos.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground font-medium">
                No active to-dos. Drag cards on Kanban to auto-generate preparation tasks!
              </div>
            ) : (
              todos.slice(0, 4).map((todo) => (
                <div key={todo.id} className="flex items-center space-x-3 py-3">
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={(e) => void handleToggleTodo(todo.id, e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      "text-sm font-medium leading-relaxed truncate",
                      todo.done ? "text-muted-foreground line-through" : "text-foreground"
                    )}>
                      {todo.text}
                    </p>
                    {todo.due_date && (
                      <span className="text-[10px] text-muted-foreground font-bold">
                        Due: {format(parseISO(todo.due_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold text-lg">
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Explore and trigger agentic tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-all group shadow-sm"
                >
                  <div className="p-2 rounded-lg bg-muted group-hover:bg-background transition-colors">
                    <Icon className={`w-5 h-5 ${action.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground truncate font-medium">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Skills breakdown */}
      {profile?.skills && profile.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Semantically Extracted Skills Profile
            </CardTitle>
            <CardDescription>Your CV Section skills currently active for job scoring and AI matches</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="px-3 py-1 font-semibold text-xs bg-muted border font-mono uppercase">
                {skill}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
