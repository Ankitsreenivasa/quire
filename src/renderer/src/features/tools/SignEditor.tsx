import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Loader2, ChevronLeft, ChevronRight, Signature as SignatureIcon } from 'lucide-react'
import type { InputFile, RenderedPage } from '@shared/types'
import type { FieldValue } from '@/tools/registry'
import { mediaUrl } from '@/lib/cn'
import { SignaturePad } from '@/features/editor/SignaturePad'

interface Props {
  file: InputFile
  values: Record<string, FieldValue>
  onChange: (patch: Record<string, FieldValue>) => void
}

const num = (v: FieldValue | undefined, d: number): number =>
  typeof v === 'number' ? v : typeof v === 'string' && v !== '' && !isNaN(+v) ? +v : d
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))
const clamp01 = (n: number): number => clamp(n, 0, 1)
const round = (n: number): number => Math.round(n * 1000) / 1000

export function SignEditor({ file, values, onChange }: Props): JSX.Element {
  const [pages, setPages] = useState<RenderedPage[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [padOpen, setPadOpen] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageW, setStageW] = useState(0)
  const imgAspect = useRef(0.4)

  const pageIdx = Math.max(0, num(values.page, 1) - 1)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    window.api
      .renderPdf(file.path, Math.round(1000 * (window.devicePixelRatio || 1) * 1.4))
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
    if (!stageRef.current) return
    const ro = new ResizeObserver(([e]) => setStageW(e.contentRect.width))
    ro.observe(stageRef.current)
    return () => ro.disconnect()
  }, [state])

  useEffect(() => {
    if (values.xPct === undefined) onChange({ xPct: 0.68, yPct: 0.86, scale: 0.26 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const page = pages[Math.min(pageIdx, pages.length - 1)]
  const dispScale = page && stageW ? stageW / page.width : 1
  const xPct = num(values.xPct, 0.68)
  const yPct = num(values.yPct, 0.86)
  const scale = num(values.scale, 0.26)
  const sigPath = values.signaturePath ? String(values.signaturePath) : ''

  const boxW = page ? scale * page.width * dispScale : 0
  const boxH = boxW * imgAspect.current

  const onSignatureCreated = async (dataUrl: string): Promise<void> => {
    const path = await window.api.saveTempImage(dataUrl)
    onChange({ signaturePath: path })
  }

  const drag = (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = stageRef.current!.getBoundingClientRect()
    const start = { mx: e.clientX, my: e.clientY, xPct, yPct, scale, boxW }
    const onMove = (ev: PointerEvent): void => {
      if (mode === 'move') {
        onChange({
          xPct: round(clamp01(start.xPct + (ev.clientX - start.mx) / rect.width)),
          yPct: round(clamp01(start.yPct + (ev.clientY - start.my) / rect.height))
        })
      } else if (page) {
        const d = Math.max(ev.clientX - start.mx, ev.clientY - start.my)
        const newW = Math.max(20, start.boxW + d)
        onChange({ scale: round(clamp(newW / dispScale / page.width, 0.05, 1)) })
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

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <button className="btn-outline py-1.5 text-xs" onClick={() => setPadOpen(true)}>
          <SignatureIcon size={14} /> {sigPath ? 'Change signature' : 'Create signature'}
        </button>
        {pages.length > 1 && (
          <div className="flex items-center gap-1 text-xs">
            <button
              className="btn-ghost h-7 w-7 p-0"
              disabled={pageIdx === 0}
              onClick={() => onChange({ page: pageIdx })}
            >
              <ChevronLeft size={14} />
            </button>
            {pageIdx + 1} / {pages.length}
            <button
              className="btn-ghost h-7 w-7 p-0"
              disabled={pageIdx >= pages.length - 1}
              onClick={() => onChange({ page: pageIdx + 2 })}
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

          {sigPath ? (
            <div
              className="absolute cursor-move"
              style={{
                left: `${xPct * 100}%`,
                top: `${yPct * 100}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onPointerDown={drag('move')}
            >
              <div className="relative" style={{ width: boxW, height: boxH }}>
                <img
                  src={mediaUrl(sigPath)}
                  alt="signature"
                  draggable={false}
                  className="h-full w-full object-contain"
                  onLoad={(e) => {
                    imgAspect.current =
                      e.currentTarget.naturalHeight / e.currentTarget.naturalWidth || 0.4
                  }}
                />
                <span className="pointer-events-none absolute inset-0 border border-dashed border-brand/60" />
                <span
                  className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-surface bg-brand"
                  onPointerDown={drag('resize')}
                />
              </div>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-xs text-muted">
              Create a signature, then drag it into place
            </div>
          )}
        </div>
      </div>

      {padOpen && (
        <SignaturePad onClose={() => setPadOpen(false)} onDone={onSignatureCreated} />
      )}
    </div>
  )
}
