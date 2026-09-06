import { promises as fs } from 'fs'
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import sharp from 'sharp'
import { writeResult, stem } from '../fsutil'
import { parsePageRange } from './ranges'
import { throwIfAborted, type JobRunner } from '../types'

type Pos = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface Options {
  type?: 'text' | 'image'
  text?: string
  /** path to an image file, provided as an extra input or a picked file */
  imagePath?: string
  opacity?: number // 0..1
  angle?: number
  fontSize?: number
  color?: string
  position?: Pos
  tile?: boolean
  scale?: number // image scale 0..1 of page width
  pages?: string
  /** normalized center from the interactive editor (0..1, y measured from top) */
  xPct?: number
  yPct?: number
}

function hexToRgb(hex?: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!m) return rgb(0.6, 0.6, 0.6)
  const int = parseInt(m[1], 16)
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255)
}

export const watermarkPdf: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  const type = opts.type ?? 'text'
  const opacity = opts.opacity ?? 0.3
  const angle = opts.angle ?? 45
  const position = opts.position ?? 'center'
  const results = []

  for (let i = 0; i < req.files.length; i++) {
    throwIfAborted(ctx.signal)
    const f = req.files[i]
    const doc = await PDFDocument.load(await fs.readFile(f.path))
    const pages = doc.getPages()
    const target = opts.pages ? new Set(parsePageRange(opts.pages, pages.length)) : null

    const font = type === 'text' ? await doc.embedFont(StandardFonts.HelveticaBold) : null
    let image: Awaited<ReturnType<PDFDocument['embedPng']>> | null = null
    if (type === 'image' && opts.imagePath) {
      const png = await sharp(opts.imagePath).png().toBuffer()
      image = await doc.embedPng(png)
    }

    const fontSize = opts.fontSize ?? 48
    const color = hexToRgb(opts.color)
    const text = opts.text ?? 'CONFIDENTIAL'

    pages.forEach((page, idx) => {
      if (target && !target.has(idx + 1)) return
      const { width, height } = page.getSize()

      const rad = (angle * Math.PI) / 180
      // rotate an offset (dx,dy) about origin, so the watermark spins about its own centre
      const rot = (cx: number, cy: number, dx: number, dy: number): { x: number; y: number } => ({
        x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
        y: cy + dx * Math.sin(rad) + dy * Math.cos(rad)
      })

      const drawOne = (cx: number, cy: number) => {
        if (type === 'text' && font) {
          const tw = font.widthOfTextAtSize(text, fontSize)
          const o = rot(cx, cy, -tw / 2, -fontSize * 0.32)
          page.drawText(text, {
            x: o.x,
            y: o.y,
            size: fontSize,
            font,
            color,
            opacity,
            rotate: degrees(angle)
          })
        } else if (image) {
          const w = width * (opts.scale ?? 0.4)
          const h = (image.height / image.width) * w
          const o = rot(cx, cy, -w / 2, -h / 2)
          page.drawImage(image, {
            x: o.x,
            y: o.y,
            width: w,
            height: h,
            opacity,
            rotate: degrees(angle)
          })
        }
      }

      if (opts.tile) {
        const stepX = width / 3
        const stepY = height / 4
        for (let gx = 0.5; gx < 3; gx += 1) {
          for (let gy = 0.5; gy < 4; gy += 1) {
            drawOne(gx * stepX, gy * stepY)
          }
        }
      } else if (opts.xPct !== undefined && opts.yPct !== undefined) {
        drawOne(opts.xPct * width, (1 - opts.yPct) * height)
      } else {
        const pad = 80
        const px =
          position.includes('left') ? pad : position.includes('right') ? width - pad : width / 2
        const py =
          position.includes('top') ? height - pad : position.includes('bottom') ? pad : height / 2
        drawOne(px, py)
      }
    })

    const bytes = await doc.save()
    results.push(await writeResult(ctx.outDir, `${stem(f.path)}-watermarked.pdf`, bytes))
    ctx.onProgress((i + 1) / req.files.length)
  }

  return results
}
