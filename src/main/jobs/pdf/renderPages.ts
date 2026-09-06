import { promises as fs } from 'fs'
import { createCanvas } from '@napi-rs/canvas'
import { loadPdf, NodeCanvasFactory } from './pdfjs'

export interface RenderedPage {
  page: number
  /** JPEG data URL, or '' when this page could not be rasterised */
  dataUrl: string
  /** intrinsic page size in PDF points */
  width: number
  height: number
  failed?: boolean
}

/** hard cap on the raster width so a huge request can't blow up memory */
const MAX_WIDTH = 3000

async function renderOne(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  factory: NodeCanvasFactory,
  pixelWidth: number,
  withAnnotations: boolean
): Promise<{ dataUrl: string; width: number; height: number }> {
  const base = page.getViewport({ scale: 1 })
  const scale = Math.min(pixelWidth, MAX_WIDTH) / base.width
  const viewport = page.getViewport({ scale })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
    canvasFactory: factory,
    annotationMode: withAnnotations ? 1 : 0
  }).promise
  return {
    dataUrl: `data:image/jpeg;base64,${canvas.toBuffer('image/jpeg', 0.86).toString('base64')}`,
    width: base.width,
    height: base.height
  }
}

/**
 * Rasterise PDF pages in the main process.
 *
 * `pixelWidth` is the actual bitmap width to produce — the renderer passes its
 * on-screen CSS width times devicePixelRatio so the result is crisp on HiDPI
 * displays. Resilient: a page that fails still returns (blank) rather than
 * throwing the whole document away.
 */
export async function renderPdfPages(
  filePath: string,
  pixelWidth = 1400,
  maxPages = 60
): Promise<RenderedPage[]> {
  const data = new Uint8Array(await fs.readFile(filePath))
  const doc = await loadPdf(data)
  const factory = new NodeCanvasFactory()
  const out: RenderedPage[] = []
  const count = Math.min(doc.numPages, maxPages)

  for (let p = 1; p <= count; p++) {
    let sizeW = 612
    let sizeH = 792
    try {
      const page = await doc.getPage(p)
      const base = page.getViewport({ scale: 1 })
      sizeW = base.width
      sizeH = base.height
      try {
        out.push({ page: p, ...(await renderOne(page, factory, pixelWidth, false)) })
      } catch (err1) {
        console.warn(`renderPdfPages: page ${p} retry (annotations on):`, err1)
        out.push({ page: p, ...(await renderOne(page, factory, Math.min(pixelWidth, 1000), true)) })
      }
    } catch (err) {
      console.error(`renderPdfPages: page ${p} of ${filePath} failed:`, err)
      out.push({ page: p, dataUrl: '', width: sizeW, height: sizeH, failed: true })
    }
  }

  await doc.cleanup()
  return out
}
