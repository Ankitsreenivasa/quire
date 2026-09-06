import { createRequire } from 'module'
import { dirname, join, sep } from 'path'
import { createCanvas } from '@napi-rs/canvas'

const require = createRequire(import.meta.url)

// pdfjs legacy build works under Node (CJS). Loaded lazily so the main bundle stays small.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any

/** filesystem dirs shipped inside pdfjs-dist, needed to render base-14 fonts and CJK cmaps */
function pdfjsAssetUrls(): { standardFontDataUrl: string; cMapUrl: string } {
  const root = dirname(require.resolve('pdfjs-dist/package.json'))
  // pdfjs' Node data factories read these with fs, so use plain paths with a trailing separator
  return {
    standardFontDataUrl: join(root, 'standard_fonts') + sep,
    cMapUrl: join(root, 'cmaps') + sep
  }
}

export async function getPdfjs(): Promise<any> {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  }
  return pdfjsLib
}

export class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height)
    return { canvas, context: canvas.getContext('2d') }
  }
  reset(cc: { canvas: any }, width: number, height: number) {
    cc.canvas.width = width
    cc.canvas.height = height
  }
  destroy(cc: { canvas: any; context: any }) {
    cc.canvas.width = 0
    cc.canvas.height = 0
    cc.canvas = null
    cc.context = null
  }
}

export async function loadPdf(data: Uint8Array) {
  const pdfjs = await getPdfjs()
  return pdfjs.getDocument({
    data,
    canvasFactory: new NodeCanvasFactory(),
    isEvalSupported: false,
    useSystemFonts: false,
    ...pdfjsAssetUrls()
  }).promise
}
