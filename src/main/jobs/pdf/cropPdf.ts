import { loadPdfDoc } from './load'
import { writeResult, stem } from '../fsutil'
import { throwIfAborted, type JobRunner } from '../types'

interface Options {
  /** all 0..1; x/y are the top-left corner, y measured from the page top */
  cropXPct?: number
  cropYPct?: number
  cropWPct?: number
  cropHPct?: number
  applyTo?: 'all' | 'first'
}

export const cropPdf: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  const xPct = opts.cropXPct ?? 0
  const yPct = opts.cropYPct ?? 0
  const wPct = opts.cropWPct ?? 1
  const hPct = opts.cropHPct ?? 1
  const results = []

  for (let i = 0; i < req.files.length; i++) {
    throwIfAborted(ctx.signal)
    const f = req.files[i]
    const doc = await loadPdfDoc(f.path)

    if (wPct > 0 && hPct > 0 && (xPct > 0 || yPct > 0 || wPct < 1 || hPct < 1)) {
      doc.getPages().forEach((page, idx) => {
        if (opts.applyTo === 'first' && idx !== 0) return
        const box = page.getMediaBox()
        const nx = box.x + xPct * box.width
        const nw = wPct * box.width
        const nh = hPct * box.height
        const ny = box.y + (1 - yPct - hPct) * box.height
        page.setCropBox(nx, ny, nw, nh)
      })
    }

    const bytes = await doc.save()
    results.push(await writeResult(ctx.outDir, `${stem(f.path)}-cropped.pdf`, bytes))
    ctx.onProgress((i + 1) / req.files.length)
  }

  return results
}
