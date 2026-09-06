import { promises as fs } from 'fs'
import JSZip from 'jszip'
import { createCanvas } from '@napi-rs/canvas'
import { loadPdf, NodeCanvasFactory } from './pdfjs'
import { writeResult, stem } from '../fsutil'
import { parsePageRange } from './ranges'
import { throwIfAborted, type JobRunner } from '../types'

interface Options {
  format?: 'png' | 'jpg'
  dpi?: number
  quality?: number
  pages?: string // e.g. "1-3,5"
  zip?: boolean
}

export const pdfToImages: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  const format = opts.format ?? 'jpg'
  const dpi = opts.dpi ?? 150
  const scale = dpi / 72
  const results = []

  for (let fi = 0; fi < req.files.length; fi++) {
    throwIfAborted(ctx.signal)
    const f = req.files[fi]
    const data = new Uint8Array(await fs.readFile(f.path))
    const doc = await loadPdf(data)
    const factory = new NodeCanvasFactory()
    const selected = opts.pages ? parsePageRange(opts.pages, doc.numPages) : range(1, doc.numPages)

    const zip = opts.zip ? new JSZip() : null

    for (let idx = 0; idx < selected.length; idx++) {
      throwIfAborted(ctx.signal)
      const pageNum = selected[idx]
      const page = await doc.getPage(pageNum)
      const viewport = page.getViewport({ scale })
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      const context = canvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: context as unknown as CanvasRenderingContext2D, viewport, canvasFactory: factory }).promise

      const buf =
        format === 'png'
          ? canvas.toBuffer('image/png')
          : canvas.toBuffer('image/jpeg', (opts.quality ?? 85) / 100)
      const name = `${stem(f.path)}-${String(pageNum).padStart(3, '0')}.${format === 'png' ? 'png' : 'jpg'}`

      if (zip) {
        zip.file(name, buf)
      } else {
        results.push(await writeResult(ctx.outDir, name, buf))
      }

      ctx.onProgress((fi + (idx + 1) / selected.length) / req.files.length)
    }

    if (zip) {
      const zbuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
      results.push(await writeResult(ctx.outDir, `${stem(f.path)}-images.zip`, zbuf))
    }
    await doc.cleanup()
  }

  return results
}

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i)
}
