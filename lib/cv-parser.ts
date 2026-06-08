// Polyfill DOMMatrix for serverless environment (Vercel) to prevent pdf-parse crash
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-ignore
  globalThis.DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: any) {
      if (init && Array.isArray(init)) {
        this.a = init[0] ?? 1;
        this.b = init[1] ?? 0;
        this.c = init[2] ?? 0;
        this.d = init[3] ?? 1;
        this.e = init[4] ?? 0;
        this.f = init[5] ?? 0;
      }
    }
    static fromMatrix() { return new DOMMatrix(); }
  };
}

import mammoth from 'mammoth'
import pdfParse from 'pdf-parse'

export async function extractTextFromFile(
  data: Uint8Array,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase()

  if (lower.endsWith('.pdf')) {
    const buffer = Buffer.from(data)
    const result = await pdfParse(buffer)
    return result.text
  }

  if (lower.endsWith('.docx')) {
    // mammoth's types expect Buffer, so convert here.
    const buffer = Buffer.from(data)
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error('Unsupported file type. Please upload PDF or DOCX.')
}

