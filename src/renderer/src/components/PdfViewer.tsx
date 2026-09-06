import { useEffect, useState } from 'react'
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react'
import { renderPdfPages, type PageThumb } from '@/lib/pdfThumbs'

interface Props {
  /** media:// URL or data URL of the PDF */
  url: string
  /** starting page width in CSS px */
  baseWidth?: number
  className?: string
}

export function PdfViewer({ url, baseWidth = 560, className }: Props): JSX.Element {
  const [pages, setPages] = useState<PageThumb[]>([])
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [progress, setProgress] = useState<[number, number]>([0, 0])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPages([])
    renderPdfPages(url, baseWidth, (d, t) => !cancelled && setProgress([d, t]))
      .then((p) => !cancelled && setPages(p))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [url, baseWidth])

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted">
          {loading
            ? `Rendering ${progress[0]}/${progress[1] || '…'}`
            : `${pages.length} page${pages.length > 1 ? 's' : ''}`}
        </span>
        <div className="flex gap-1">
          <button
            className="btn-ghost h-7 w-7 p-0"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))}
          >
            <ZoomOut size={14} />
          </button>
          <button
            className="btn-ghost h-7 w-7 p-0"
            onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      <div className="flex max-h-[70vh] flex-col items-center gap-3 overflow-y-auto rounded-lg bg-surface-2 p-4">
        {loading && pages.length === 0 && (
          <div className="flex items-center gap-2 py-10 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
          </div>
        )}
        {pages.map((pg) => (
          <img
            key={pg.page}
            src={pg.dataUrl}
            alt={`Page ${pg.page}`}
            className="rounded shadow-card"
            style={{ width: pg.width * zoom, height: 'auto' }}
          />
        ))}
      </div>
    </div>
  )
}
