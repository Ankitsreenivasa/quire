import { promises as fs } from 'fs'
import { PDFDocument } from '@cantoo/pdf-lib'
import { writeResult, stem } from '../fsutil'
import { throwIfAborted, type JobRunner } from '../types'

interface Options {
  password?: string
}

/** Load `bytes`, decrypting if needed. Throws if a password is required and wrong/missing. */
async function openDecrypted(bytes: Uint8Array, password?: string): Promise<PDFDocument> {
  // not encrypted at all
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false })
  } catch {
    /* encrypted — fall through */
  }
  // encrypted: try the supplied password, then an empty one (owner-only lock)
  for (const pw of [password, '']) {
    if (pw === undefined) continue
    try {
      return await PDFDocument.load(bytes, { password: pw, updateMetadata: false })
    } catch {
      /* try next */
    }
  }
  throw new Error('needs-password')
}

export const unlockPdf: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  const password = (opts.password ?? '').trim() || undefined
  const results = []

  for (let i = 0; i < req.files.length; i++) {
    throwIfAborted(ctx.signal)
    const f = req.files[i]
    const bytes = await fs.readFile(f.path)

    let src: PDFDocument
    try {
      src = await openDecrypted(bytes, password)
    } catch {
      throw new Error(
        `Couldn't open ${f.name}. ${
          password ? 'That password is incorrect.' : 'This PDF needs its password — enter it above.'
        }`
      )
    }

    // Re-emit the pages into a fresh, unencrypted document.
    const out = await PDFDocument.create()
    const copied = await out.copyPages(src, src.getPageIndices())
    copied.forEach((p) => out.addPage(p))
    const title = src.getTitle()
    if (title) out.setTitle(title)

    const bytesOut = await out.save()
    results.push(await writeResult(ctx.outDir, `${stem(f.path)}-unlocked.pdf`, bytesOut))
    ctx.onProgress((i + 1) / req.files.length)
  }

  return results
}
