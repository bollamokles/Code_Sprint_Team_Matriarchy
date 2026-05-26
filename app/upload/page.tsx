'use client'

import { useState } from 'react'
import { FileUp, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useUserId } from '@/hooks/use-user-id'

export default function UploadPage() {
  const { userId, ready, setUserId } = useUserId()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [sections, setSections] = useState<Record<string, number> | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !ready) return

    setStatus('loading')
    setMessage('Parsing, chunking, and embedding your CV…')
    setSections(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId)

    try {
      const res = await fetch('/api/upload-cv', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setStatus('success')
      setMessage(`Indexed ${data.chunks} chunks from your CV.`)
      setSections(data.sections ?? null)
    } catch (err) {
      setStatus('error')
      setMessage(String(err))
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">CV Upload</h1>
        <p className="text-muted-foreground">
          PDF or DOCX → section-aware chunks → Ollama embeddings → Supabase pgvector
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Upload your CV</CardTitle>
          <CardDescription>This becomes the source of truth for RAG across the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">User ID</label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} />
          </div>

          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-muted/30">
            {status === 'loading' ? (
              <Loader2 className="size-10 animate-spin text-muted-foreground" />
            ) : status === 'success' ? (
              <CheckCircle2 className="size-10 text-emerald-600" />
            ) : (
              <FileUp className="size-10 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {status === 'loading' ? 'Processing…' : 'Drop PDF or DOCX, or click to browse'}
            </span>
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleUpload}
              disabled={status === 'loading'}
            />
          </label>

          {message && (
            <p className={status === 'error' ? 'text-destructive text-sm' : 'text-sm text-muted-foreground'}>
              {message}
            </p>
          )}

          {sections && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(sections).map(([section, count]) => (
                <Badge key={section} variant="secondary">
                  {section}: {count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
