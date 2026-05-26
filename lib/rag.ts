import { supabaseAdmin } from './supabase'
import { embedText } from './embeddings'

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
  const queryEmbedding = await embedText(question)

  const { data, error } = await supabaseAdmin.rpc('match_cv_chunks', {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: matchCount,
  })

  if (error) throw error
  return (data ?? []) as CVChunkMatch[]
}

export function formatCVContext(chunks: CVChunkMatch[]): string {
  if (chunks.length === 0) {
    return 'No CV data found. Ask the user to upload their CV first.'
  }
  return chunks
    .map((c) => `[${c.section}] (relevance: ${(c.similarity * 100).toFixed(0)}%)\n${c.content}`)
    .join('\n\n')
}
