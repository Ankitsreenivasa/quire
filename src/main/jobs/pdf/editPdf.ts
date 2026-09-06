import { BlendMode, StandardFonts, degrees, rgb } from '@cantoo/pdf-lib'
import type { PDFFont, PDFImage, PDFPage } from '@cantoo/pdf-lib'
import sharp from 'sharp'
import type { PdfAnnotation } from '../../../shared/types'
import { loadPdfDoc } from './load'
import { writeResult, stem } from '../fsutil'
import { throwIfAborted, type JobRunner } from '../types'

interface Options {
  annotations?: PdfAnnotation[]
}

function hexToRgb(hex?: string): ReturnType<typeof rgb> {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!m) return rgb(0.1, 0.1, 0.1)
  const int = parseInt(m[1], 16)
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255)
}

async function drawAnnotation(
  page: PDFPage,
  a: PdfAnnotation,
  font: PDFFont,
  embedImage: (path: string) => Promise<PDFImage | null>
): Promise<void> {
  const H = page.getSize().height
  const color = hexToRgb(a.color)
  const opacity = a.opacity ?? 1
  const border = a.strokeWidth ?? 2
  // convert top-left/top-origin box to pdf-lib bottom-origin
  const bottom = H - a.y - a.h

  switch (a.type) {
    case 'text':
      page.drawText(a.text ?? '', {
        x: a.x,
        y: H - a.y - (a.fontSize ?? 16),
        size: a.fontSize ?? 16,
        font,
        color,
        opacity
      })
      break
    case 'rect':
      page.drawRectangle({
        x: a.x,
        y: bottom,
        width: a.w,
        height: a.h,
        borderColor: color,
        borderWidth: border,
        color: a.fill ? color : undefined,
        opacity: a.fill ? opacity : undefined,
        borderOpacity: opacity
      })
      break
    case 'highlight':
      page.drawRectangle({
        x: a.x,
        y: bottom,
        width: a.w,
        height: a.h,
        color,
        opacity: a.opacity ?? 0.35,
        blendMode: BlendMode.Multiply
      })
      break
    case 'ellipse':
      page.drawEllipse({
        x: a.x + a.w / 2,
        y: bottom + a.h / 2,
        xScale: Math.abs(a.w / 2),
        yScale: Math.abs(a.h / 2),
        borderColor: color,
        borderWidth: border,
        color: a.fill ? color : undefined,
        opacity: a.fill ? opacity : undefined,
        borderOpacity: opacity
      })
      break
    case 'line':
    case 'arrow': {
      const start = { x: a.x, y: H - a.y }
      const end = { x: a.x + a.w, y: H - (a.y + a.h) }
      page.drawLine({ start, end, thickness: border, color, opacity })
      if (a.type === 'arrow') {
        const ang = Math.atan2(end.y - start.y, end.x - start.x)
        const head = Math.max(8, border * 4)
        for (const off of [Math.PI - 0.4, Math.PI + 0.4]) {
          page.drawLine({
            start: end,
            end: {
              x: end.x + head * Math.cos(ang + off),
              y: end.y + head * Math.sin(ang + off)
            },
            thickness: border,
            color,
            opacity
          })
        }
      }
      break
    }
    case 'draw': {
      const pts = a.points ?? []
      for (let i = 1; i < pts.length; i++) {
        page.drawLine({
          start: { x: a.x + pts[i - 1].x, y: H - (a.y + pts[i - 1].y) },
          end: { x: a.x + pts[i].x, y: H - (a.y + pts[i].y) },
          thickness: border,
          color,
          opacity
        })
      }
      break
    }
    case 'image': {
      if (!a.imagePath) break
      const img = await embedImage(a.imagePath)
      if (!img) break
      page.drawImage(img, { x: a.x, y: bottom, width: a.w, height: a.h, opacity, rotate: degrees(0) })
      break
    }
  }
}

export const editPdf: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  const annotations = opts.annotations ?? []
  const f = req.files[0]
  if (!f) throw new Error('Add a PDF to edit.')

  const doc = await loadPdfDoc(f.path)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const imageCache = new Map<string, PDFImage | null>()

  const embedImage = async (path: string): Promise<PDFImage | null> => {
    if (imageCache.has(path)) return imageCache.get(path) ?? null
    let img: PDFImage | null = null
    try {
      const png = await sharp(path).png().toBuffer()
      img = await doc.embedPng(png)
    } catch {
      img = null
    }
    imageCache.set(path, img)
    return img
  }

  for (let i = 0; i < annotations.length; i++) {
    throwIfAborted(ctx.signal)
    const a = annotations[i]
    const page = pages[a.page - 1]
    if (page) await drawAnnotation(page, a, font, embedImage)
    ctx.onProgress((i + 1) / Math.max(1, annotations.length))
  }

  const bytes = await doc.save()
  return [await writeResult(ctx.outDir, `${stem(f.path)}-edited.pdf`, bytes)]
}
