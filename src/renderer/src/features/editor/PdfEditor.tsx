import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Loader2,
  MousePointer2,
  Type,
  Square,
  Circle,
  Minus,
  MoveUpRight,
  Pen,
  Highlighter,
  Image as ImageIcon,
  Trash2
} from 'lucide-react'
import type { InputFile, PdfAnnotation, RenderedPage } from '@shared/types'
import { cn, mediaUrl, uid } from '@/lib/cn'

export type Annotation = PdfAnnotation

type Tool = 'select' | 'text' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'draw' | 'highlight' | 'image'

interface Props {
  file: InputFile
  annotations: Annotation[]
  onChange: (next: Annotation[]) => void
}

const TOOLS: { id: Tool; icon: typeof Type; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'highlight', icon: Highlighter, label: 'Highlight' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'arrow', icon: MoveUpRight, label: 'Arrow' },
  { id: 'draw', icon: Pen, label: 'Draw' },
  { id: 'image', icon: ImageIcon, label: 'Image' }
]

export function PdfEditor({ file, annotations, onChange }: Props): JSX.Element {
  const [pages, setPages] = useState<RenderedPage[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [tool, setTool] = useState<Tool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [color, setColor] = useState('#c4562e')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [fontSize, setFontSize] = useState(16)
  const [fill, setFill] = useState(false)

  const stageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [stageW, setStageW] = useState<number[]>([])
  // latest annotations, for use inside pointermove handlers
  const curRef = useRef<Annotation[]>(annotations)
  curRef.current = annotations

  useEffect(() => {
    let cancelled = false
    setState('loading')
    window.api
      .renderPdf(file.path, Math.round(1100 * (window.devicePixelRatio || 1)))
      .then((p) => {
        if (cancelled) return
        setPages(p)
        setState(p.length ? 'ready' : 'error')
      })
      .catch(() => !cancelled && setState('error'))
    return () => {
      cancelled = true
    }
  }, [file.path])

  useLayoutEffect(() => {
    const ros: ResizeObserver[] = []
    stageRefs.current.forEach((el, i) => {
      if (!el) return
      const ro = new ResizeObserver(([e]) =>
        setStageW((cur) => {
          const next = [...cur]
          next[i] = e.contentRect.width
          return next
        })
      )
      ro.observe(el)
      ros.push(ro)
    })
    return () => ros.forEach((r) => r.disconnect())
  }, [state, pages.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const active = document.activeElement?.tagName
        if (active === 'INPUT' || active === 'TEXTAREA') return
        onChange(annotations.filter((a) => a.id !== selectedId))
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, annotations, onChange])

  const patch = (id: string, p: Partial<Annotation>): void =>
    onChange(annotations.map((a) => (a.id === id ? { ...a, ...p } : a)))

  const scaleFor = (i: number): number => {
    const page = pages[i]
    const w = stageW[i]
    return page && w ? page.width / w : 1 // px -> points
  }

  const createAt = async (
    pageIndex: number,
    startPx: { x: number; y: number },
    ev: React.PointerEvent
  ): Promise<void> => {
    const s = scaleFor(pageIndex)
    const base = {
      id: uid(),
      page: pageIndex + 1,
      color,
      strokeWidth,
      opacity: tool === 'highlight' ? 0.35 : 1,
      x: startPx.x * s,
      y: startPx.y * s,
      w: 0,
      h: 0
    }

    if (tool === 'text') {
      onChange([
        ...annotations,
        { ...base, type: 'text', text: 'Text', fontSize, w: 120, h: fontSize * 1.4 }
      ])
      setSelectedId(base.id)
      setTool('select')
      return
    }

    if (tool === 'image') {
      const picked = await window.api.pickFiles([
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
      ])
      if (!picked[0]) return
      const img = new Image()
      img.onload = () => {
        const wPt = 160
        onChange([
          ...annotations,
          {
            ...base,
            type: 'image',
            imagePath: picked[0],
            w: wPt,
            h: (wPt * img.naturalHeight) / (img.naturalWidth || 1)
          }
        ])
      }
      img.src = mediaUrl(picked[0])
      setTool('select')
      return
    }

    if (tool === 'draw') {
      const stage = stageRefs.current[pageIndex]!
      const rect = stage.getBoundingClientRect()
      const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }]
      const origin = startPx
      const onMove = (e: PointerEvent): void => {
        pts.push({
          x: (e.clientX - rect.left - origin.x) * s,
          y: (e.clientY - rect.top - origin.y) * s
        })
      }
      const onUp = (): void => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        const xs = pts.map((p) => p.x)
        const ys = pts.map((p) => p.y)
        onChange([
          ...annotations,
          {
            ...base,
            type: 'draw',
            points: pts,
            w: Math.max(...xs) - Math.min(...xs),
            h: Math.max(...ys) - Math.min(...ys)
          }
        ])
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      return
    }

    // drag-to-size shapes: rect / ellipse / highlight / line / arrow
    const type = tool as Annotation['type']
    const stage = stageRefs.current[pageIndex]!
    const rect = stage.getBoundingClientRect()
    const id = base.id
    onChange([...annotations, { ...base, type, fill: fill && (type === 'rect' || type === 'ellipse') }])
    setSelectedId(id)
    const onMove = (e: PointerEvent): void => {
      const dx = (e.clientX - ev.clientX) * s
      const dy = (e.clientY - ev.clientY) * s
      onChange(
        (curRef.current || []).map((a) =>
          a.id === id ? { ...a, w: dx, h: dy } : a
        )
      )
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      // normalize negative sizes for box shapes
      onChange(
        (curRef.current || []).map((a) => {
          if (a.id !== id) return a
          if (type === 'line' || type === 'arrow') return a
          const nx = a.w < 0 ? a.x + a.w : a.x
          const ny = a.h < 0 ? a.y + a.h : a.y
          return { ...a, x: nx, y: ny, w: Math.abs(a.w), h: Math.abs(a.h) }
        })
      )
      setTool('select')
    }
    void rect
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const onStagePointerDown = (pageIndex: number) => (e: React.PointerEvent) => {
    if (tool === 'select') {
      setSelectedId(null)
      return
    }
    const rect = stageRefs.current[pageIndex]!.getBoundingClientRect()
    void createAt(pageIndex, { x: e.clientX - rect.left, y: e.clientY - rect.top }, e)
  }

  const startMove = (a: Annotation, pageIndex: number) => (e: React.PointerEvent) => {
    if (tool !== 'select') return
    e.stopPropagation()
    setSelectedId(a.id)
    const s = scaleFor(pageIndex)
    const start = { mx: e.clientX, my: e.clientY, x: a.x, y: a.y }
    const onMove = (ev: PointerEvent): void => {
      patch(a.id, {
        x: start.x + (ev.clientX - start.mx) * s,
        y: start.y + (ev.clientY - start.my) * s
      })
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const startResize = (a: Annotation, pageIndex: number) => (e: React.PointerEvent) => {
    e.stopPropagation()
    const s = scaleFor(pageIndex)
    const start = { mx: e.clientX, my: e.clientY, w: a.w, h: a.h }
    const freeform = a.type === 'line' || a.type === 'arrow'
    const onMove = (ev: PointerEvent): void => {
      const nw = start.w + (ev.clientX - start.mx) * s
      const nh = start.h + (ev.clientY - start.my) * s
      patch(a.id, {
        w: freeform ? nw : Math.max(6, nw),
        h: freeform ? nh : Math.max(6, nh)
      })
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const selected = annotations.find((a) => a.id === selectedId) ?? null

  if (state === 'loading') {
    return (
      <div className="card flex items-center gap-2 p-10 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading document…
      </div>
    )
  }
  if (state === 'error') {
    return <div className="card p-10 text-center text-sm text-muted">Couldn’t render this PDF.</div>
  }

  return (
    <div className="card overflow-hidden">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            title={t.label}
            onClick={() => setTool(t.id)}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-md transition-colors',
              tool === t.id ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
            )}
          >
            <t.icon size={15} />
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-border" />
        <input
          type="color"
          value={selected ? selected.color : color}
          onChange={(e) => {
            setColor(e.target.value)
            if (selected) patch(selected.id, { color: e.target.value })
          }}
          className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent"
          title="Colour"
        />
        {(tool === 'text' || selected?.type === 'text') && (
          <label className="flex items-center gap-1 text-xs text-muted">
            size
            <input
              type="number"
              min={6}
              max={200}
              value={selected?.type === 'text' ? selected.fontSize ?? fontSize : fontSize}
              onChange={(e) => {
                const v = Number(e.target.value) || 16
                setFontSize(v)
                if (selected?.type === 'text') patch(selected.id, { fontSize: v, h: v * 1.4 })
              }}
              className="input h-7 w-16 px-1.5 py-0"
            />
          </label>
        )}
        {(['rect', 'ellipse', 'line', 'arrow', 'draw'].includes(tool) ||
          (selected && ['rect', 'ellipse', 'line', 'arrow', 'draw'].includes(selected.type))) && (
          <label className="flex items-center gap-1 text-xs text-muted">
            weight
            <input
              type="number"
              min={1}
              max={20}
              value={selected ? selected.strokeWidth ?? strokeWidth : strokeWidth}
              onChange={(e) => {
                const v = Number(e.target.value) || 2
                setStrokeWidth(v)
                if (selected) patch(selected.id, { strokeWidth: v })
              }}
              className="input h-7 w-14 px-1.5 py-0"
            />
          </label>
        )}
        {(tool === 'rect' || tool === 'ellipse' || selected?.type === 'rect' || selected?.type === 'ellipse') && (
          <label className="flex items-center gap-1 text-xs text-muted">
            <input
              type="checkbox"
              checked={selected ? !!selected.fill : fill}
              onChange={(e) => {
                setFill(e.target.checked)
                if (selected) patch(selected.id, { fill: e.target.checked })
              }}
            />
            fill
          </label>
        )}
        {selected && (
          <button
            className="btn-ghost ml-auto h-7 px-2 text-xs text-brand"
            onClick={() => {
              onChange(annotations.filter((a) => a.id !== selected.id))
              setSelectedId(null)
            }}
          >
            <Trash2 size={13} /> Delete
          </button>
        )}
      </div>

      {/* pages */}
      <div className="max-h-[70vh] space-y-6 overflow-auto bg-surface-2 p-4">
        {pages.map((page, i) => {
          const w = stageW[i] || 800
          const pxPerPt = w / page.width
          return (
            <div key={i} className="mx-auto w-full max-w-[860px]">
              <div
                ref={(el) => (stageRefs.current[i] = el)}
                className="relative w-full select-none shadow-card"
                style={{ lineHeight: 0, cursor: tool === 'select' ? 'default' : 'crosshair' }}
                onPointerDown={onStagePointerDown(i)}
              >
                {page.dataUrl ? (
                  <img src={page.dataUrl} alt="" className="w-full" draggable={false} />
                ) : (
                  <div
                    className="w-full bg-white"
                    style={{ aspectRatio: `${page.width} / ${page.height}` }}
                  />
                )}

                {annotations
                  .filter((a) => a.page === i + 1)
                  .map((a) => (
                    <AnnotationView
                      key={a.id}
                      a={a}
                      pxPerPt={pxPerPt}
                      selected={a.id === selectedId}
                      selectable={tool === 'select'}
                      onMoveStart={startMove(a, i)}
                      onResizeStart={startResize(a, i)}
                      onText={(t) => patch(a.id, { text: t })}
                    />
                  ))}
              </div>
              <p className="mt-1 text-center text-[11px] text-muted">Page {i + 1}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AnnotationView({
  a,
  pxPerPt,
  selected,
  selectable,
  onMoveStart,
  onResizeStart,
  onText
}: {
  a: Annotation
  pxPerPt: number
  selected: boolean
  selectable: boolean
  onMoveStart: (e: React.PointerEvent) => void
  onResizeStart: (e: React.PointerEvent) => void
  onText: (t: string) => void
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (selected && a.type === 'text') inputRef.current?.focus()
  }, [selected, a.type])

  const left = a.x * pxPerPt
  const top = a.y * pxPerPt
  const w = a.w * pxPerPt
  const h = a.h * pxPerPt
  const ring = selected ? 'outline outline-1 outline-brand' : ''

  if (a.type === 'line' || a.type === 'arrow') {
    return (
      <svg
        className={cn('absolute overflow-visible', selectable && 'cursor-move')}
        style={{ left, top, width: 1, height: 1 }}
        onPointerDown={onMoveStart}
      >
        {a.type === 'arrow' && (
          <defs>
            <marker id={`ah-${a.id}`} markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={a.color} />
            </marker>
          </defs>
        )}
        <line
          x1={0}
          y1={0}
          x2={w}
          y2={h}
          stroke={a.color}
          strokeWidth={(a.strokeWidth ?? 2) * pxPerPt}
          strokeLinecap="round"
          opacity={a.opacity ?? 1}
          markerEnd={a.type === 'arrow' ? `url(#ah-${a.id})` : undefined}
        />
        {selected && (
          <circle cx={w} cy={h} r={4} fill="#c4562e" onPointerDown={onResizeStart} />
        )}
      </svg>
    )
  }

  const common: React.CSSProperties = {
    left,
    top,
    width: Math.max(2, w),
    height: Math.max(2, h),
    opacity: a.opacity ?? 1
  }

  return (
    <div
      className={cn('absolute', selectable && 'cursor-move', ring)}
      style={common}
      onPointerDown={onMoveStart}
    >
      {a.type === 'rect' && (
        <div
          className="h-full w-full"
          style={{
            border: `${(a.strokeWidth ?? 2) * pxPerPt}px solid ${a.color}`,
            background: a.fill ? a.color : 'transparent'
          }}
        />
      )}
      {a.type === 'highlight' && (
        <div className="h-full w-full" style={{ background: a.color, mixBlendMode: 'multiply' }} />
      )}
      {a.type === 'ellipse' && (
        <div
          className="h-full w-full rounded-[50%]"
          style={{
            border: `${(a.strokeWidth ?? 2) * pxPerPt}px solid ${a.color}`,
            background: a.fill ? a.color : 'transparent'
          }}
        />
      )}
      {a.type === 'draw' && (
        <svg className="absolute inset-0 overflow-visible" style={{ width: 1, height: 1 }}>
          <polyline
            points={(a.points ?? []).map((p) => `${p.x * pxPerPt},${p.y * pxPerPt}`).join(' ')}
            fill="none"
            stroke={a.color}
            strokeWidth={(a.strokeWidth ?? 2) * pxPerPt}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {a.type === 'image' && a.imagePath && (
        <img src={mediaUrl(a.imagePath)} alt="" className="h-full w-full object-fill" draggable={false} />
      )}
      {a.type === 'text' && (
        <input
          ref={inputRef}
          value={a.text ?? ''}
          onChange={(e) => onText(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          className="h-full w-full border-none bg-transparent p-0 outline-none"
          style={{
            color: a.color,
            fontSize: (a.fontSize ?? 16) * pxPerPt,
            fontFamily: 'Helvetica, Arial, sans-serif',
            lineHeight: 1.2
          }}
        />
      )}

      {selected && a.type !== 'text' && (
        <span
          className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-full border-2 border-surface bg-brand"
          onPointerDown={onResizeStart}
        />
      )}
    </div>
  )
}
