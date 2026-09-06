import { promises as fs } from 'fs'
import { createCanvas } from '@napi-rs/canvas'
import { loadPdf, NodeCanvasFactory } from './pdfjs'

export interface RenderedPage {
  page: number
  dataUrl: string
  /** intrinsic page size in PDF points */
  width: number
  height: number
}

/**
 * Rasterise PDF pages in the main process (where pdfjs + a real canvas already
 * work) and hand the renderer ready-to-show JPEG data URLs. Avoids shipping the
 * pdfjs worker to the renderer and sidesteps custom-protocol/CORS issues.
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
    const page = await doc.getPage(p)
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
      canvasFactory: factory
    }).promise
    out.push({
      page: p,
      dataUrl: `data:image/jpeg;base64,${canvas.toBuffer('image/jpeg', 0.72).toString('base64')}`,
      width: base.width,
      height: base.height
    })
  }

  await doc.cleanup()
  return out
}
