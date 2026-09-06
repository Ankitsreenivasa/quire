import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { InputFile, RenderedPage } from '@shared/types'
import type { FieldValue } from '@/tools/registry'
import { mediaUrl, cn } from '@/lib/cn'

interface Props {
  file: InputFile
  values: Record<string, FieldValue>
  onChange: (patch: Record<string, FieldValue>) => void
}

const num = (v: FieldValue | undefined, d: number): number =>
  typeof v === 'number' ? v : typeof v === 'string' && v !== '' && !isNaN(+v) ? +v : d

export function WatermarkEditor({ file, values, onChange }: Props): JSX.Element {
  const [pages, setPages] = useState<RenderedPage[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pageIdx, setPageIdx] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageW, setStageW] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    window.api
      .renderPdf(file.path, 900)
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

  const page = pages[pageIdx]
  // px-per-point for the currently displayed page
  const dispScale = page && stageW ? stageW / page.width : 1

  useLayoutEffect(() => {
    if (!stageRef.current) return
    const ro = new ResizeObserver(([e]) => setStageW(e.contentRect.width))
    ro.observe(stageRef.current)
    return () => ro.disconnect()
  }, [state])

  // initialise position once
  useEffect(() => {
    if (values.xPct === undefined || values.yPct === undefined) {
      onChange({ xPct: 0.5, yPct: 0.5 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const type = String(values.type ?? 'text')
  const tile = Boolean(values.tile)
  const angle = num(values.angle, 45)
  const opacity = num(values.opacity, 0.3)
  const xPct = num(values.xPct, 0.5)
  const yPct = num(values.yPct, 0.5)
  const fontSizePt = num(values.fontSize, 48)
  const scale = num(values.scale, 0.4)
  const text = String(values.text ?? 'CONFIDENTIAL')
  const color = String(values.color ?? '#888888')
  const imagePath = values.imagePath ? String(values.imagePath) : ''

  const imgAspect = useRef(1)

  // watermark box size in display px
  const boxW = useMemo(() => {
    if (!page) return 0
    if (type === 'image') return scale * page.width * dispScale
    // approximate text width: 0.62 * fontSize * chars
    return Math.max(24, text.length * fontSizePt * 0.6) * dispScale
  }, [page, type, scale, dispScale, text, fontSizePt])
  const boxH = useMemo(() => {
    if (type === 'image') return boxW * imgAspect.current
    return fontSizePt * 1.2 * dispScale
  }, [type, boxW, fontSizePt, dispScale])

  const drag = (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = stageRef.current!.getBoundingClientRect()
    const start = { mx: e.clientX, my: e.clientY, xPct, yPct, fontSizePt, scale }
    const onMove = (ev: PointerEvent): void => {
      if (mode === 'move') {
        const nx = clamp01(start.xPct + (ev.clientX - start.mx) / rect.width)
        const ny = clamp01(start.yPct + (ev.clientY - start.my) / rect.height)
        onChange({ xPct: round(nx), yPct: round(ny) })
      } else {
        const dPx = Math.max(ev.clientX - start.mx, ev.clientY - start.my)
        if (type === 'image' && page) {
          const newBoxW = Math.max(20, boxW + dPx)
          onChange({ scale: round(clamp(newBoxW / dispScale / page.width, 0.03, 1)) })
        } else {
          const factor = (boxW + dPx) / Math.max(1, boxW)
          onChange({ fontSize: Math.round(clamp(start.fontSizePt * factor, 8, 400)) })
        }
      }
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

  const wmStyle: React.CSSProperties = {
    opacity,
    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
    left: `${xPct * 100}%`,
    top: `${yPct * 100}%`
  }

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs text-muted">
          {tile ? 'Tiled watermark — drag disabled' : 'Drag to position · drag the corner to resize'}
        </span>
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
            <div
              className="w-full bg-white"
              style={{ aspectRatio: `${page.width} / ${page.height}` }}
            />
          )}

          {/* tiled preview */}
          {tile && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute whitespace-nowrap font-bold"
                  style={{
                    opacity,
                    color: type === 'text' ? color : undefined,
                    left: `${(i % 3) * 33 + 16}%`,
                    top: `${Math.floor(i / 3) * 25 + 12}%`,
                    fontSize: fontSizePt * dispScale * 0.7,
                    transform: `translate(-50%,-50%) rotate(${angle}deg)`
                  }}
                >
                  {type === 'text' ? text : imagePath ? '🖼' : ''}
                </div>
              ))}
            </div>
          )}

          {/* draggable single watermark */}
          {!tile && (
            <div
              className="absolute cursor-move"
              style={wmStyle}
              onPointerDown={drag('move')}
            >
              <div className="relative" style={{ width: boxW, height: boxH }}>
                {type === 'text' ? (
                  <span
                    className="absolute inset-0 flex items-center justify-center whitespace-nowrap font-bold"
                    style={{ color, fontSize: fontSizePt * dispScale }}
                  >
                    {text}
                  </span>
                ) : imagePath ? (
                  <img
                    src={mediaUrl(imagePath)}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-contain"
                    onLoad={(e) => {
                      imgAspect.current = e.currentTarget.naturalHeight / e.currentTarget.naturalWidth
                    }}
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-muted">
                    Choose an image →
                  </span>
                )}
                <span className="pointer-events-none absolute inset-0 border border-dashed border-brand/60" />
                <span
                  className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-surface bg-brand"
                  onPointerDown={drag('resize')}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))
const clamp01 = (n: number): number => clamp(n, 0, 1)
const round = (n: number): number => Math.round(n * 1000) / 1000
