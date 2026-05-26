import Link from 'next/link'
import { Briefcase, FileUp, MessageSquare, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const pillars = [
  {
    title: 'CV Upload & RAG',
    description: 'Upload PDF/DOCX, chunk by section, embed with Ollama, store in Supabase pgvector.',
    href: '/upload',
    icon: FileUp,
  },
  {
    title: 'AI Assistant',
    description: 'Chat grounded in your CV — interview prep, cover letters, career advice.',
    href: '/assistant',
    icon: MessageSquare,
  },
  {
    title: 'Job Hunter',
    description: 'Natural language job search via Adzuna with AI fit scores from your CV.',
    href: '/jobs',
    icon: Briefcase,
  },
  {
    title: 'Progress Tracker',
    description: 'Kanban pipeline, to-dos, goals, and calendar for your job search.',
    href: '/tracker',
    icon: Target,
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">CareerPilot</h1>
        <p className="mt-2 text-muted-foreground">
          Your agentic career co-pilot. Start by uploading your CV, then explore jobs, chat with
          your AI assistant, and track your progress — all grounded in your experience.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link href="/upload">Upload CV</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/assistant">Open Assistant</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {pillars.map(({ title, description, href, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary">Open →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="max-w-2xl border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Quick start</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ol className="list-decimal space-y-1 pl-4">
            <li>Run Ollama with <code className="rounded bg-muted px-1">qwen3.5:4b</code> and <code className="rounded bg-muted px-1">nomic-embed-text</code></li>
            <li>Apply <code className="rounded bg-muted px-1">supabase/schema.sql</code> in your Supabase project</li>
            <li>Set env vars (see <code className="rounded bg-muted px-1">.env.example</code>)</li>
            <li>Upload your CV, then try job search and chat</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
