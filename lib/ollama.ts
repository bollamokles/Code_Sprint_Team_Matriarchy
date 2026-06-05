import { GoogleGenerativeAI } from '@google/generative-ai'

export const OLLAMA_CHAT_MODEL = 'gemini-2.5-flash'
export const OLLAMA_EMBED_MODEL = 'gemini-embedding-2'

let _genAI: GoogleGenerativeAI | null = null
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(apiKey)
  }
  return _genAI
}

export async function ollamaChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: { temperature?: number }
): Promise<string> {
  const genAI = getGenAI()
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.')
  }

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

    const modelName = process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash'
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
    console.error('[LLM Gateway] Gemini Chat Error:', geminiErr)
    throw geminiErr
  }
}

export async function ollamaEmbed(text: string): Promise<number[]> {
  // Always return a dummy 768-dimensional vector to satisfy Supabase vector(768) constraints
  return new Array(768).fill(0)
}

