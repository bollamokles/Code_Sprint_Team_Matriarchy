'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useUserId } from '@/hooks/use-user-id'
import { cn } from '@/lib/utils'

type Message = { id?: string; role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Summarize my strongest skills for a software role',
  'Draft a 2-sentence professional summary',
  'What gaps should I address for a senior engineer role?',
  'Help me prepare talking points for my latest role',
]

export default function AssistantPage() {
  const { userId, ready } = useUserId()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ready) return
    fetch(`/api/chat?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.messages) setMessages(d.messages)
      })
      .catch(() => {})
  }, [userId, ready])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading || !ready) return

    setInput('')
    setLoading(true)
    setMessages((m) => [...m, { role: 'user', content: msg }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: msg }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
      setSources(data.sources ?? [])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `Error: ${err}. Is Ollama running?` },
      ])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <p className="text-muted-foreground">Conversational chat grounded in your CV via RAG</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader className="shrink-0 border-b py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Chat</CardTitle>
              {sources.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sources.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-3 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Ask anything about your career — answers use your uploaded CV.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] rounded-xl px-4 py-2.5 text-sm',
                    m.role === 'user'
                      ? 'ml-auto bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Thinking…
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="flex gap-2 border-t p-4">
              <Textarea
                placeholder="Ask about your CV, roles, skills…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                rows={2}
                className="min-h-0 resize-none"
              />
              <Button size="icon" className="shrink-0 self-end" onClick={() => send()} disabled={loading}>
                <Send className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
