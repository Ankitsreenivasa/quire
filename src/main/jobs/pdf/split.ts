import { PDFDocument } from 'pdf-lib'
import { loadPdfDoc } from './load'
import { writeResult, stem } from '../fsutil'
import { parseRangeGroups, parsePageRange } from './ranges'
import { throwIfAborted, type JobRunner } from '../types'

interface Options {
  mode?: 'ranges' | 'every' | 'extract'
  ranges?: string // "1-3;4-6" for mode ranges
  every?: number // for mode every
  extract?: string // "1,3,5" -> single pdf with those pages
}

async function subset(src: PDFDocument, pages: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const copied = await doc.copyPages(src, pages.map((p) => p - 1))
  copied.forEach((p) => doc.addPage(p))
  return doc.save()
}

export const splitPdf: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  const mode = opts.mode ?? 'every'
  const results = []

  for (let fi = 0; fi < req.files.length; fi++) {
    throwIfAborted(ctx.signal)
    const f = req.files[fi]
    const src = await loadPdfDoc(f.path)
    const total = src.getPageCount()
    const base = stem(f.path)

    let groups: number[][] = []
    if (mode === 'ranges') {
      groups = parseRangeGroups(opts.ranges ?? `1-${total}`, total)
    } else if (mode === 'extract') {
      const pages = parsePageRange(opts.extract ?? `1-${total}`, total)
      groups = pages.length ? [pages] : []
    } else {
      const n = Math.max(1, Math.floor(opts.every ?? 1))
      for (let start = 1; start <= total; start += n) {
        groups.push(
          Array.from({ length: Math.min(n, total - start + 1) }, (_, i) => start + i)
        )
      }
    }

    for (let gi = 0; gi < groups.length; gi++) {
      throwIfAborted(ctx.signal)
      const bytes = await subset(src, groups[gi])
      const label =
        groups[gi].length === 1
          ? `${groups[gi][0]}`
          : `${groups[gi][0]}-${groups[gi][groups[gi].length - 1]}`
      results.push(await writeResult(ctx.outDir, `${base}-${label}.pdf`, bytes))
      ctx.onProgress((fi + (gi + 1) / groups.length) / req.files.length)
    }
  }

  return results
}
