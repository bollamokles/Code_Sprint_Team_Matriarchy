import OpenAI from 'openai'

// Helper to generate a 768-dimensional keyword frequency vector with TF-IDF scores
export function generateTfidfVector(text: string): number[] {
  const vector = new Array(768).fill(0)
  
  // Tokenize text: lowercase, remove non-alphanumeric, split by whitespace
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1) // skip empty or single-char tokens

  if (tokens.length === 0) {
    return vector
  }

  // Calculate Term Frequency (TF)
  const termCounts: Record<string, number> = {}
  for (const token of tokens) {
    termCounts[token] = (termCounts[token] || 0) + 1
  }

  // Simple Hash function to map tokens to 0-767
  const hashToken = (str: string): number => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0 // Convert to 32bit integer
    }
    return Math.abs(hash) % 768
  }

  // List of common English stopwords to down-weight
  const stopwords = new Set([
    'the', 'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could', 'couldnt',
    'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
    'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres', 'hers',
    'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt', 'it',
    'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
    'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shant', 'she', 'shed', 'shell',
    'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves',
    'then', 'there', 'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too',
    'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when',
    'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt',
    'you', 'youd', 'youll', 'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves'
  ])

  // Compute TF-IDF heuristic scores and add to vector
  for (const [token, count] of Object.entries(termCounts)) {
    const tf = count / tokens.length
    
    // Heuristic IDF:
    let idf = 1.0
    if (stopwords.has(token)) {
      idf = 0.05
    } else {
      // Longer/rarer words get slightly higher IDF heuristic
      idf = Math.log(1 + 10 / (token.length + 1)) + 0.5
    }
    
    const score = tf * idf
    const index = hashToken(token)
    vector[index] += score
  }

  // L2 Normalize the vector to ensure similarity works nicely in pgvector
  let sumSq = 0
  for (let i = 0; i < 768; i++) {
    sumSq += vector[i] * vector[i]
  }
  if (sumSq > 0) {
    const norm = Math.sqrt(sumSq)
    for (let i = 0; i < 768; i++) {
      vector[i] /= norm
    }
  }

  return vector
}

export async function embedText(text: string): Promise<number[]> {
  const skipOllama = !process.env.OLLAMA_BASE_URL || process.env.VERCEL
  let ollamaReachable = false

  if (!skipOllama) {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 1000) // 1s timeout
      const res = await fetch(`${ollamaUrl}/api/tags`, {
        signal: controller.signal,
      })
      clearTimeout(id)
      if (res.ok) {
        ollamaReachable = true
      }
    } catch (e) {
      ollamaReachable = false
    }

    if (ollamaReachable) {
      try {
        console.log('Ollama is reachable, requesting embedding...')
        const res = await fetch(`${ollamaUrl}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
            prompt: text,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.embedding && Array.isArray(data.embedding)) {
            let vector = data.embedding
            if (vector.length < 768) {
              vector = [...vector, ...new Array(768 - vector.length).fill(0)]
            } else if (vector.length > 768) {
              vector = vector.slice(0, 768)
            }
            return vector
          }
        }
      } catch (e) {
        console.error('Ollama embedding request failed:', e)
      }
    }
  }

  // 2. If Ollama is not reachable or fails, check for Groq
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey && groqKey !== 'your_groq_key_here' && groqKey.trim() !== '') {
    try {
      console.log('Ollama unreachable. Attempting Groq embedding call...')
      const openai = new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
      })
      const response = await openai.embeddings.create({
        model: 'nomic-embed-text', // Or another embedding model supported in the environment/fallback
        input: text,
      })
      if (response.data?.[0]?.embedding) {
        let vector = response.data[0].embedding
        if (vector.length < 768) {
          vector = [...vector, ...new Array(768 - vector.length).fill(0)]
        } else if (vector.length > 768) {
          vector = vector.slice(0, 768)
        }
        return vector
      }
    } catch (error) {
      console.error('Groq embedding API failed, falling back to TF-IDF:', error)
    }
  }

  // 3. Fallback to TF-IDF
  console.log('Falling back to local TF-IDF embedding vector generation.')
  return generateTfidfVector(text)
}

export function computeCosineSimilarity(str1: string, str2: string): number {
  const tokenize = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 0)
  }

  const tokens1 = tokenize(str1)
  const tokens2 = tokenize(str2)

  if (tokens1.length === 0 || tokens2.length === 0) return 0

  // Count term frequencies
  const freq1: Record<string, number> = {}
  const freq2: Record<string, number> = {}

  tokens1.forEach((w) => (freq1[w] = (freq1[w] || 0) + 1))
  tokens2.forEach((w) => (freq2[w] = (freq2[w] || 0) + 1))

  // Vocabulary
  const vocab = new Set([...Object.keys(freq1), ...Object.keys(freq2)])

  // Cosine Similarity
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  vocab.forEach((word) => {
    const val1 = freq1[word] || 0
    const val2 = freq2[word] || 0
    dotProduct += val1 * val2
    norm1 += val1 * val1
    norm2 += val2 * val2
  })

  if (norm1 === 0 || norm2 === 0) return 0
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

