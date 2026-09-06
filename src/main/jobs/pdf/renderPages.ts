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

async function renderOne(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  factory: NodeCanvasFactory,
  targetWidth: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  const base = page.getViewport({ scale: 1 })
  const scale = targetWidth / base.width
  const viewport = page.getViewport({ scale })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
    canvasFactory: factory,
    // some PDFs carry annotations/widgets that the node canvas can't paint
    annotationMode: 0
  }).promise
  return {
    dataUrl: `data:image/jpeg;base64,${canvas.toBuffer('image/jpeg', 0.72).toString('base64')}`,
    width: base.width,
    height: base.height
  }
}

/**
 * Rasterise PDF pages in the main process. Resilient: a page that fails to
 * render comes back with dataUrl:'' and failed:true instead of throwing, so a
 * single bad page never blanks the whole document.
 */
export async function renderPdfPages(
  filePath: string,
  targetWidth = 700,
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
        out.push({ page: p, ...(await renderOne(page, factory, targetWidth)) })
      } catch (err) {
        // retry smaller — some content only fails past a certain raster size
        console.warn(`renderPdfPages: page ${p} retry at low res:`, err)
        out.push({ page: p, ...(await renderOne(page, factory, 480)) })
      }
    } catch (err) {
      console.error(`renderPdfPages: page ${p} of ${filePath} failed:`, err)
      out.push({ page: p, dataUrl: '', width: sizeW, height: sizeH, failed: true })
    }
  }

  await doc.cleanup()
  return out
}
