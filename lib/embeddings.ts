import { ollamaEmbed } from './ollama'

export async function embedText(text: string): Promise<number[]> {
  return ollamaEmbed(text)
}
