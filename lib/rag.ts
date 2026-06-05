import { supabaseAdmin } from './supabase'
import { computeCosineSimilarity } from './embeddings'

export type CVChunkMatch = {
  id: string
  content: string
  section: string
  similarity: number
}

export async function queryCV(
  userId: string,
  question: string,
  matchCount = 5
): Promise<CVChunkMatch[]> {
  const { data: chunks, error } = await supabaseAdmin
    .from('cv_chunks')
    .select('id, content, section')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching CV chunks from database:', error)
    return []
  }

  if (!chunks || chunks.length === 0) {
    return []
  }

  // Calculate local TF-IDF cosine similarity
  const matches: CVChunkMatch[] = chunks.map((chunk) => {
    const similarity = computeCosineSimilarity(question, chunk.content)
    return {
      id: chunk.id,
      content: chunk.content,
      section: chunk.section,
      similarity,
    }
  })

  // Sort descending and return top matches
  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, matchCount)
}


export function formatCVContext(chunks: CVChunkMatch[]): string {
  if (chunks.length === 0) {
    return 'No CV data found. Ask the user to upload their CV first.'
  }
  return chunks
    .map((c) => `[${c.section}] (relevance: ${(c.similarity * 100).toFixed(0)}%)\n${c.content}`)
    .join('\n\n')
}
