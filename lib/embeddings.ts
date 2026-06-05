export async function embedText(text: string): Promise<number[]> {
  // Return a dummy 768-dimensional vector to satisfy Supabase vector(768) database schema
  return new Array(768).fill(0)
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

