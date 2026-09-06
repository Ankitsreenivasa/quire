import * as pdfjsLib from 'pdfjs-dist'
// Vite resolves this to a same-origin worker bundle.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker()

export interface PageThumb {
  page: number
  dataUrl: string
  width: number
  height: number
}

export async function renderPdfThumbnails(
  url: string,
  maxEdge = 160,
  onProgress?: (done: number, total: number) => void
): Promise<PageThumb[]> {
  const doc = await pdfjsLib.getDocument({ url }).promise
  const out: PageThumb[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const base = page.getViewport({ scale: 1 })
    const scale = maxEdge / Math.max(base.width, base.height)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')!
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: context, viewport }).promise
    out.push({
      page: p,
      dataUrl: canvas.toDataURL('image/jpeg', 0.7),
      width: base.width,
      height: base.height
    })
    onProgress?.(p, doc.numPages)
  }
  await doc.cleanup()
  return out
}
