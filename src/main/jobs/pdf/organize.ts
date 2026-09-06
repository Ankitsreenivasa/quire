import { PDFDocument, degrees } from '@cantoo/pdf-lib'
import { loadPdfDoc } from './load'
import { writeResult, stem } from '../fsutil'
import { throwIfAborted, type JobRunner } from '../types'

interface PageOp {
  /** 1-based index into the concatenation of all input files, in file order */
  page: number
  rotate?: number
}
interface Options {
  order?: PageOp[]
}

export const organizePdf: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options

  // Build a combined source so "insert pages from another PDF" works: the UI
  // passes extra files and references their pages by the running index.
  const combined = await PDFDocument.create()
  for (const f of req.files) {
    throwIfAborted(ctx.signal)
    const src = await loadPdfDoc(f.path)
    const copied = await combined.copyPages(src, src.getPageIndices())
    copied.forEach((p) => combined.addPage(p))
  }

  const totalPages = combined.getPageCount()
  const order: PageOp[] = opts.order?.length
    ? opts.order
    : Array.from({ length: totalPages }, (_, i) => ({ page: i + 1 }))

  const out = await PDFDocument.create()
  for (let i = 0; i < order.length; i++) {
    throwIfAborted(ctx.signal)
    const op = order[i]
    if (op.page < 1 || op.page > totalPages) continue
    const [copied] = await out.copyPages(combined, [op.page - 1])
    if (op.rotate) {
      copied.setRotation(degrees((copied.getRotation().angle + op.rotate) % 360))
    }
    out.addPage(copied)
    ctx.onProgress((i + 1) / order.length)
  }

  const bytes = await out.save()
  return [await writeResult(ctx.outDir, `${stem(req.files[0].path)}-organized.pdf`, bytes)]
}
