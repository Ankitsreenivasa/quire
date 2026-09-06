import { StandardFonts, rgb } from '@cantoo/pdf-lib'
import { loadPdfDoc } from './load'
import { writeResult, stem } from '../fsutil'
import { parsePageRange } from './ranges'
import { throwIfAborted, type JobRunner } from '../types'

type Pos = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

interface Options {
  position?: Pos
  format?: string // supports {n} and {total}
  fontSize?: number
  startAt?: number
  margin?: number
  pages?: string
  color?: string // hex
}

function hexToRgb(hex?: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!m) return rgb(0.2, 0.2, 0.2)
  const int = parseInt(m[1], 16)
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255)
}

export const pageNumbersPdf: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  const position = opts.position ?? 'bottom-center'
  const fmt = opts.format ?? '{n}'
  const fontSize = opts.fontSize ?? 11
  const margin = opts.margin ?? 24
  const startAt = opts.startAt ?? 1
  const color = hexToRgb(opts.color)
  const results = []

  for (let i = 0; i < req.files.length; i++) {
    throwIfAborted(ctx.signal)
    const f = req.files[i]
    const doc = await loadPdfDoc(f.path)
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const pages = doc.getPages()
    const target = opts.pages ? new Set(parsePageRange(opts.pages, pages.length)) : null
    const shownTotal = target ? target.size : pages.length

    let counter = startAt
    pages.forEach((page, idx) => {
      if (target && !target.has(idx + 1)) return
      const text = fmt.replace('{n}', String(counter)).replace('{total}', String(shownTotal))
      counter += 1
      const tw = font.widthOfTextAtSize(text, fontSize)
      const { width, height } = page.getSize()
      const isTop = position.startsWith('top')
      const y = isTop ? height - margin - fontSize : margin
      let x = margin
      if (position.endsWith('center')) x = (width - tw) / 2
      else if (position.endsWith('right')) x = width - margin - tw
      page.drawText(text, { x, y, size: fontSize, font, color })
    })

    const bytes = await doc.save()
    results.push(await writeResult(ctx.outDir, `${stem(f.path)}-numbered.pdf`, bytes))
    ctx.onProgress((i + 1) / req.files.length)
  }

  return results
}
