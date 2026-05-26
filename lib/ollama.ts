const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
export const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? 'qwen3.5:4b'
export const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text'

export async function ollamaChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: { temperature?: number }
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_CHAT_MODEL,
      messages,
      stream: false,
      options: { temperature: options?.temperature ?? 0.7 },
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Ollama chat error: ${JSON.stringify(data)}`)
  }
  return data.message?.content ?? ''
}

export async function ollamaEmbed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_EMBED_MODEL,
      prompt: text,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Ollama embed error: ${JSON.stringify(data)}`)
  }
  return data.embedding as number[]
}
