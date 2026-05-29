import mammoth from 'mammoth'

export async function extractTextFromFile(
  data: Uint8Array,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase()

  if (lower.endsWith('.pdf')) {
    /**
     * `pdf-parse@2.x` no longer exports a callable function in some module
     * resolution environments (e.g. it exports a namespace with `PDFParse`).
     * This path works reliably under Node/Next server runtime.
     */
    type PdfParseModule = {
      PDFParse: new (buf: Buffer) => { getText: () => Promise<unknown> }
    }

    const mod = (await import('pdf-parse')) as unknown as PdfParseModule
    const PDFParseCtor = mod.PDFParse as unknown as new (data: Uint8Array) => {
      getText: () => Promise<unknown>
    }
    const parser = new PDFParseCtor(data)
    const raw: unknown = await parser.getText()
    // `pdf-parse` has inconsistent runtime shapes across versions (string vs object vs array).
    // Normalize aggressively so downstream `.replace()` and chunking always see real text.
    const text = (() => {
      if (typeof raw === 'string') return raw
      if (Array.isArray(raw)) {
        return raw
          .map((part) => {
            if (typeof part === 'string') return part
            if (part && typeof part === 'object') {
              const maybeText = (part as { text?: unknown }).text
              if (typeof maybeText === 'string') return maybeText
            }
            return String(part ?? '')
          })
          .join('\n')
      }
      if (raw && typeof raw === 'object') {
        const maybeText = (raw as { text?: unknown }).text
        if (typeof maybeText === 'string') return maybeText
      }
      return String(raw ?? '')
    })()
    return text
  }

  if (lower.endsWith('.docx')) {
    // mammoth's types expect Buffer, so convert here.
    const buffer = Buffer.from(data)
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error('Unsupported file type. Please upload PDF or DOCX.')
}
