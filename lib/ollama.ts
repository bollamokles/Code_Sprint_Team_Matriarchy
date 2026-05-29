import { GoogleGenerativeAI } from '@google/generative-ai'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
export const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? 'qwen3.5:4b'
export const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text'

// Initialize the Google Generative AI client if the key is available
const geminiApiKey = process.env.GEMINI_API_KEY
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null

if (genAI) {
  console.log('[LLM Gateway] Gemini API client initialized. Running in cloud mode.')
} else {
  console.log('[LLM Gateway] No Gemini API key detected. Running in local Ollama mode.')
}

export async function ollamaChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: { temperature?: number }
): Promise<string> {
  // If Gemini API is available, route to Gemini
  if (genAI) {
    try {
      console.log('[LLM Gateway] Chat: Routing to Gemini...')
      
      // Extract system instructions if present
      const systemMessage = messages.find((m) => m.role === 'system')
      const chatMessages = messages.filter((m) => m.role !== 'system')

      // Convert messages to Gemini SDK contents format
      const contents = chatMessages.map((m) => {
        // Gemini expects 'user' or 'model' for roles
        const role = m.role === 'assistant' ? 'model' : 'user'
        return {
          role,
          parts: [{ text: m.content }],
        }
      })

      // Check if JSON response is expected by looking at the prompts
      const isJsonExpected = messages.some(
        (m) =>
          m.content.toLowerCase().includes('json') ||
          (m.role === 'system' && m.content.toLowerCase().includes('json'))
      )

      const modelName = process.env.GEMINI_CHAT_MODEL ?? 'gemini-1.5-flash'
      const model = genAI.getGenerativeModel({
        model: modelName,
        ...(systemMessage ? { systemInstruction: systemMessage.content } : {}),
      })

      const generationConfig: any = {
        temperature: options?.temperature ?? 0.7,
      }

      if (isJsonExpected) {
        generationConfig.responseMimeType = 'application/json'
      }

      const result = await model.generateContent({
        contents,
        generationConfig,
      })

      const response = await result.response
      const text = response.text()
      return text ?? ''
    } catch (geminiErr) {
      console.error('[LLM Gateway] Gemini Chat Error, falling back to Ollama:', geminiErr)
    }
  }

  // Fallback to local Ollama
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
    const errMsg =
      typeof data?.error === 'string'
        ? data.error
        : typeof data?.message === 'string'
          ? data.message
          : JSON.stringify(data)
    throw new Error(`Ollama chat error: ${errMsg}`)
  }
  
  const content =
    data?.message?.content ?? data?.response ?? data?.content ?? (typeof data === 'string' ? data : '')
  return content ?? ''
}

export async function ollamaEmbed(text: string): Promise<number[]> {
  // If Gemini API is available, route to Gemini embeddings
  if (genAI) {
    try {
      const modelName = process.env.GEMINI_EMBED_MODEL ?? 'gemini-embedding-2'
      const model = genAI.getGenerativeModel({ model: modelName })
      
      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        outputDimensionality: 768
      } as any)
      if (!result.embedding?.values) {
        throw new Error(`Gemini embedding failed or returned empty values`)
      }
      return result.embedding.values
    } catch (geminiErr) {
      console.error('[LLM Gateway] Gemini Embedding Error, falling back to Ollama:', geminiErr)
    }
  }

  // Fallback to local Ollama
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
