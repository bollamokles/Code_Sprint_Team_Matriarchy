const SECTION_PATTERNS: { pattern: RegExp; section: string }[] = [
  { pattern: /^(professional\s+)?summary|profile|about\s+me|objective$/i, section: 'summary' },
  { pattern: /^work\s+experience|professional\s+experience|employment|experience$/i, section: 'experience' },
  { pattern: /^education|academic|qualifications$/i, section: 'education' },
  { pattern: /^skills|technical\s+skills|core\s+competencies|expertise$/i, section: 'skills' },
  { pattern: /^projects?$/i, section: 'projects' },
  { pattern: /^certifications?|licenses?$/i, section: 'certifications' },
  { pattern: /^achievements?|awards?$/i, section: 'achievements' },
  { pattern: /^languages?$/i, section: 'languages' },
  { pattern: /^interests?|hobbies$/i, section: 'interests' },
]

const MAX_CHUNK_CHARS = 1200

export type CVChunk = { content: string; section: string }

function normalizeText(text: unknown): string {
  const s = typeof text === 'string' ? text : String(text)
  return s
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function isLikelyHeader(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.length < 3 || trimmed.length > 60) return false
  if (/^[-•*]\s/.test(trimmed)) return false
  if (/\d{4}/.test(trimmed) && trimmed.length > 30) return false

  const letters = trimmed.replace(/[^a-zA-Z]/g, '')
  if (letters.length < 3) return false

  const upperRatio = (trimmed.match(/[A-Z]/g)?.length ?? 0) / letters.length
  const isAllCaps = trimmed === trimmed.toUpperCase() && letters.length > 4
  const titleCase = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(trimmed)

  return isAllCaps || upperRatio > 0.6 || titleCase || SECTION_PATTERNS.some((s) => s.pattern.test(trimmed))
}

function detectSection(headerLine: string): string {
  const trimmed = headerLine.trim()
  for (const { pattern, section } of SECTION_PATTERNS) {
    if (pattern.test(trimmed)) return section
  }
  return 'general'
}

function splitLongBlock(content: string, section: string): CVChunk[] {
  if (content.length <= MAX_CHUNK_CHARS) {
    return [{ content, section }]
  }

  const parts: CVChunk[] = []
  const paragraphs = content.split(/\n{2,}/).filter(Boolean)
  let buffer = ''

  for (const para of paragraphs) {
    if ((buffer + '\n\n' + para).length > MAX_CHUNK_CHARS && buffer) {
      parts.push({ content: buffer.trim(), section })
      buffer = para
    } else {
      buffer = buffer ? `${buffer}\n\n${para}` : para
    }
  }
  if (buffer.trim()) parts.push({ content: buffer.trim(), section })
  return parts
}

export function chunkCVBySection(rawText: string): CVChunk[] {
  const text = normalizeText(rawText)
  if (!text) return []

  const lines = text.split('\n')
  const chunks: CVChunk[] = []
  let currentSection = 'general'
  let buffer: string[] = []

  function flush() {
    const content = buffer.join('\n').trim()
    if (content.length > 30) {
      chunks.push(...splitLongBlock(content, currentSection))
    }
    buffer = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (buffer.length) buffer.push('')
      continue
    }

    if (isLikelyHeader(trimmed) && buffer.join('\n').trim().length > 20) {
      flush()
      currentSection = detectSection(trimmed)
      buffer.push(trimmed)
      continue
    }

    buffer.push(trimmed)
  }

  flush()

  if (chunks.length === 0 && text.length > 0) {
    const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 50)
    if (paragraphs.length > 0) {
      for (const para of paragraphs) {
        chunks.push(...splitLongBlock(para.trim(), 'general'))
      }
    } else {
      chunks.push({ content: text.slice(0, MAX_CHUNK_CHARS), section: 'general' })
    }
  }

  return chunks
}
