import { promises as fs } from 'fs'
import { PDFDocument } from 'pdf-lib'

/**
 * Load a PDF for editing. `ignoreEncryption` lets us open the very common
 * "no user password, owner-locked" PDFs (certificates, statements, exports)
 * that would otherwise throw.
 */
export async function loadPdfDoc(path: string): Promise<PDFDocument> {
  return PDFDocument.load(await fs.readFile(path), { ignoreEncryption: true })
}
