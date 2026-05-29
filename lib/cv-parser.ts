import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

export async function extractTextFromFile(
  data: Uint8Array,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase()

  if (lower.endsWith('.pdf')) {
    const loadingTask = pdfjsLib.getDocument({
      data: data,
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
    })
    const pdf = await loadingTask.promise
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n'
    }
    return fullText
  }

  if (lower.endsWith('.docx')) {
    // mammoth's types expect Buffer, so convert here.
    const buffer = Buffer.from(data)
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error('Unsupported file type. Please upload PDF or DOCX.')
}

