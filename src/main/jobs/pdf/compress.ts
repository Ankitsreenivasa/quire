import { promises as fs } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { PDFDocument } from 'pdf-lib'
import { createCanvas } from '@napi-rs/canvas'
import sharp from 'sharp'
import { loadPdf, NodeCanvasFactory } from './pdfjs'
import { writeResult, statResult, stem } from '../fsutil'
import { uniquePath } from '../fsutil'
import { throwIfAborted, type JobRunner } from '../types'

const pExecFile = promisify(execFile)

type Preset = 'screen' | 'ebook' | 'printer' | 'custom'
interface Options {
  preset?: Preset
  dpi?: number
  quality?: number
}

const PRESETS: Record<Exclude<Preset, 'custom'>, { dpi: number; quality: number; gs: string }> = {
  screen: { dpi: 72, quality: 60, gs: '/screen' },
  ebook: { dpi: 150, quality: 72, gs: '/ebook' },
  printer: { dpi: 300, quality: 85, gs: '/printer' }
}

export const compressPdf: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  const preset = opts.preset ?? 'ebook'
  const base = preset === 'custom' ? { dpi: opts.dpi ?? 150, quality: opts.quality ?? 72, gs: '/ebook' } : PRESETS[preset]
  const gsPath = ctx.settings.ghostscriptPath
  const results = []

  for (let fi = 0; fi < req.files.length; fi++) {
    throwIfAborted(ctx.signal)
    const f = req.files[fi]
    const outName = `${stem(f.path)}-compressed.pdf`

    if (gsPath) {
      const outPath = await uniquePath(ctx.outDir, outName)
      await pExecFile(gsPath, [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.5',
        `-dPDFSETTINGS=${base.gs}`,
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        `-sOutputFile=${outPath}`,
        f.path
      ])
      results.push(await statResult(outPath))
      ctx.onProgress((fi + 1) / req.files.length)
      continue
    }

    // JS fallback: rasterize each page to a downsampled JPEG and rebuild.
    const data = new Uint8Array(await fs.readFile(f.path))
    const doc = await loadPdf(data)
    const factory = new NodeCanvasFactory()
    const outPdf = await PDFDocument.create()
    const scale = base.dpi / 72

    for (let p = 1; p <= doc.numPages; p++) {
      throwIfAborted(ctx.signal)
      const page = await doc.getPage(p)
      const viewport = page.getViewport({ scale })
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      const context = canvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: context as unknown as CanvasRenderingContext2D, viewport, canvasFactory: factory }).promise
      const jpeg = await sharp(canvas.toBuffer('image/png')).jpeg({ quality: base.quality, mozjpeg: true }).toBuffer()
      const img = await outPdf.embedJpg(jpeg)
      const pw = viewport.width / scale
      const ph = viewport.height / scale
      const pageOut = outPdf.addPage([pw, ph])
      pageOut.drawImage(img, { x: 0, y: 0, width: pw, height: ph })
      ctx.onProgress((fi + p / doc.numPages) / req.files.length)
    }
    await doc.cleanup()

    const bytes = await outPdf.save()
    const original = f.size
    if (bytes.length >= original) {
      // Compression did not help; keep the original bytes but still emit a file.
      results.push(await writeResult(ctx.outDir, outName, new Uint8Array(await fs.readFile(f.path))))
    } else {
      results.push(await writeResult(ctx.outDir, outName, bytes))
    }
  }

  return results
}
