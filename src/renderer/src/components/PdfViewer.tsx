import { useEffect, useState } from 'react'
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react'
import type { RenderedPage } from '@shared/types'

interface Props {
  /** local file path of the PDF */
  path: string
  className?: string
}

export function PdfViewer({ path, className }: Props): JSX.Element {
  const [pages, setPages] = useState<RenderedPage[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    setPages([])
    window.api
      .renderPdf(path, 800)
      .then((p) => {
        if (cancelled) return
        setPages(p)
        setState(p.length ? 'ready' : 'error')
      })
      .catch(() => !cancelled && setState('error'))
    return () => {
      cancelled = true
    }
  }, [path])

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted">
          {state === 'loading'
            ? 'Rendering…'
            : state === 'error'
              ? 'Could not render this PDF'
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
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))}
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      <div className="flex max-h-[70vh] flex-col items-center gap-3 overflow-y-auto rounded-lg bg-surface-2 p-4">
        {state === 'loading' && (
          <div className="flex items-center gap-2 py-10 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
          </div>
        )}
        {state === 'error' && (
          <p className="py-10 text-sm text-muted">This file can’t be previewed.</p>
        )}
        {pages.map((pg) =>
          pg.dataUrl ? (
            <img
              key={pg.page}
              src={pg.dataUrl}
              alt={`Page ${pg.page}`}
              className="rounded shadow-card"
              style={{ width: 520 * zoom, height: 'auto' }}
            />
          ) : (
            <div
              key={pg.page}
              className="flex items-center justify-center rounded bg-white text-xs text-neutral-400 shadow-card"
              style={{ width: 520 * zoom, height: (520 * zoom * pg.height) / pg.width }}
            >
              Page {pg.page} — preview unavailable
            </div>
          )
        )}
      </div>
    </div>
  )
}
