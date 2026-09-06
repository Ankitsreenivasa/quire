import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { InputFile, RenderedPage } from '@shared/types'
import type { FieldValue } from '@/tools/registry'

interface Props {
  file: InputFile
  values: Record<string, FieldValue>
  onChange: (patch: Record<string, FieldValue>) => void
}

const num = (v: FieldValue | undefined, d: number): number =>
  typeof v === 'number' ? v : typeof v === 'string' && v !== '' && !isNaN(+v) ? +v : d

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))
const round = (n: number): number => Math.round(n * 1000) / 1000

type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se'

export function CropEditor({ file, values, onChange }: Props): JSX.Element {
  const [pages, setPages] = useState<RenderedPage[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pageIdx, setPageIdx] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageW, setStageW] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    window.api
      .renderPdf(file.path, Math.round(1000 * (window.devicePixelRatio || 1) * 1.4))
      .then((p) => {
        if (cancelled) return
        setPages(p)
        setPageIdx(0)
        setState(p.length ? 'ready' : 'error')
      })
      .catch(() => !cancelled && setState('error'))
    return () => {
      cancelled = true
    }
  }, [file.path])

  useLayoutEffect(() => {
    if (!stageRef.current) return
    const ro = new ResizeObserver(([e]) => setStageW(e.contentRect.width))
    ro.observe(stageRef.current)
    return () => ro.disconnect()
  }, [state])

  // default crop box: a light inset
  useEffect(() => {
    if (values.cropXPct === undefined) {
      onChange({ cropXPct: 0.06, cropYPct: 0.06, cropWPct: 0.88, cropHPct: 0.88 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const page = pages[pageIdx]
  const dispScale = page && stageW ? stageW / page.width : 1

  const x = num(values.cropXPct, 0.06)
  const y = num(values.cropYPct, 0.06)
  const w = num(values.cropWPct, 0.88)
  const h = num(values.cropHPct, 0.88)

  const drag = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = stageRef.current!.getBoundingClientRect()
    const start = { mx: e.clientX, my: e.clientY, x, y, w, h }
    const onMove = (ev: PointerEvent): void => {
      const dx = (ev.clientX - start.mx) / rect.width
      const dy = (ev.clientY - start.my) / rect.height
      let nx = start.x
      let ny = start.y
      let nw = start.w
      let nh = start.h
      if (handle === 'move') {
        nx = clamp(start.x + dx, 0, 1 - start.w)
        ny = clamp(start.y + dy, 0, 1 - start.h)
      } else {
        if (handle.includes('w')) {
          nx = clamp(start.x + dx, 0, start.x + start.w - 0.05)
          nw = start.w - (nx - start.x)
        }
        if (handle.includes('e')) {
          nw = clamp(start.w + dx, 0.05, 1 - start.x)
        }
        if (handle.includes('n')) {
          ny = clamp(start.y + dy, 0, start.y + start.h - 0.05)
          nh = start.h - (ny - start.y)
        }
        if (handle.includes('s')) {
          nh = clamp(start.h + dy, 0.05, 1 - start.y)
        }
      }
      onChange({
        cropXPct: round(nx),
        cropYPct: round(ny),
        cropWPct: round(nw),
        cropHPct: round(nh)
      })
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  if (state === 'loading') {
    return (
      <div className="card flex items-center gap-2 p-10 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading document…
      </div>
    )
  }
  if (state === 'error' || !page) {
    return <div className="card p-10 text-center text-sm text-muted">Couldn’t render this PDF.</div>
  }

  const boxStyle: React.CSSProperties = {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: `${w * 100}%`,
    height: `${h * 100}%`
  }
  const corner =
    'absolute h-3 w-3 rounded-full border-2 border-surface bg-brand'

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs text-muted">Drag the box · drag a corner to resize</span>
        {pages.length > 1 && (
          <div className="flex items-center gap-1 text-xs">
            <button
              className="btn-ghost h-7 w-7 p-0"
              disabled={pageIdx === 0}
              onClick={() => setPageIdx((i) => i - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            {pageIdx + 1} / {pages.length}
            <button
              className="btn-ghost h-7 w-7 p-0"
              disabled={pageIdx === pages.length - 1}
              onClick={() => setPageIdx((i) => i + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-center overflow-auto rounded-lg bg-surface-2 p-4">
        <div
          ref={stageRef}
          className="relative max-w-full select-none shadow-card"
          style={{ width: page.width * dispScale || '100%', lineHeight: 0 }}
        >
          {page.dataUrl ? (
            <img src={page.dataUrl} alt="" className="w-full" draggable={false} />
          ) : (
            <div className="w-full bg-white" style={{ aspectRatio: `${page.width} / ${page.height}` }} />
          )}

          {/* dim everything outside the crop box */}
          <div
            className="pointer-events-none absolute shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
            style={boxStyle}
          />

          {/* interactive box */}
          <div className="absolute cursor-move border border-brand" style={boxStyle} onPointerDown={drag('move')}>
            <span className={corner + ' -left-1.5 -top-1.5 cursor-nwse-resize'} onPointerDown={drag('nw')} />
            <span className={corner + ' -right-1.5 -top-1.5 cursor-nesw-resize'} onPointerDown={drag('ne')} />
            <span className={corner + ' -bottom-1.5 -left-1.5 cursor-nesw-resize'} onPointerDown={drag('sw')} />
            <span className={corner + ' -bottom-1.5 -right-1.5 cursor-nwse-resize'} onPointerDown={drag('se')} />
          </div>
        </div>
      </div>
    </div>
  )
}
