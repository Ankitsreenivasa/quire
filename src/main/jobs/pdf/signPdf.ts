import sharp from 'sharp'
import { loadPdfDoc } from './load'
import { drawImageStamp } from './stamp'
import { writeResult, stem } from '../fsutil'
import { throwIfAborted, type JobRunner } from '../types'

interface Options {
  /** path to the signature PNG produced by the editor */
  signaturePath?: string
  /** normalized centre from the editor (0..1, y from the top) */
  xPct?: number
  yPct?: number
  /** signature width as a fraction of the page width */
  scale?: number
  /** 1-based page to sign, or 'all' */
  page?: number
  applyTo?: 'one' | 'all'
}

export const signPdf: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  if (!opts.signaturePath) throw new Error('Create a signature first.')

  const png = await sharp(opts.signaturePath).png().toBuffer()
  const meta = await sharp(png).metadata()
  const aspect = (meta.height ?? 1) / (meta.width ?? 1)

  const xPct = opts.xPct ?? 0.7
  const yPct = opts.yPct ?? 0.85
  const scale = opts.scale ?? 0.25
  const results = []

  for (let i = 0; i < req.files.length; i++) {
    throwIfAborted(ctx.signal)
    const f = req.files[i]
    const doc = await loadPdfDoc(f.path)
    const image = await doc.embedPng(png)
    const pages = doc.getPages()
    const targetIdx = Math.min(Math.max((opts.page ?? 1) - 1, 0), pages.length - 1)

    pages.forEach((page, idx) => {
      if (opts.applyTo !== 'all' && idx !== targetIdx) return
      const { width, height } = page.getSize()
      const w = width * scale
      drawImageStamp(page, image, {
        cx: xPct * width,
        cy: (1 - yPct) * height,
        width: w,
        height: w * aspect
      })
    })

    const bytes = await doc.save()
    results.push(await writeResult(ctx.outDir, `${stem(f.path)}-signed.pdf`, bytes))
    ctx.onProgress((i + 1) / req.files.length)
  }

  return results
}
