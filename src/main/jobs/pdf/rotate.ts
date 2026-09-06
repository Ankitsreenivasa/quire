import { degrees } from '@cantoo/pdf-lib'
import { loadPdfDoc } from './load'
import { writeResult, stem } from '../fsutil'
import { parsePageRange } from './ranges'
import { throwIfAborted, type JobRunner } from '../types'

interface Options {
  angle?: 90 | 180 | 270
  pages?: string // empty = all
}

export const rotatePdf: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  const angle = opts.angle ?? 90
  const results = []

  for (let i = 0; i < req.files.length; i++) {
    throwIfAborted(ctx.signal)
    const f = req.files[i]
    const doc = await loadPdfDoc(f.path)
    const total = doc.getPageCount()
    const target = opts.pages ? new Set(parsePageRange(opts.pages, total)) : null
    doc.getPages().forEach((page, idx) => {
      if (target && !target.has(idx + 1)) return
      const current = page.getRotation().angle
      page.setRotation(degrees((current + angle) % 360))
    })
    const bytes = await doc.save()
    results.push(await writeResult(ctx.outDir, `${stem(f.path)}-rotated.pdf`, bytes))
    ctx.onProgress((i + 1) / req.files.length)
  }

  return results
}
