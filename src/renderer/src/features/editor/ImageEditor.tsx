import { useEffect, useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Slider from '@radix-ui/react-slider'
import { RotateCcw, RotateCw, Check, X } from 'lucide-react'
import type { ImageTransform, InputFile } from '@shared/types'
import { mediaUrl } from '@/lib/cn'

interface Props {
  file: InputFile | null
  onClose: () => void
  onApply: (id: string, transforms: ImageTransform[]) => void
}

interface CropRect {
  x: number
  y: number
  w: number
  h: number
} // normalized 0..1 of natural size

export function ImageEditor({ file, onClose, onApply }: Props): JSX.Element | null {
  const [rotate, setRotate] = useState(0)
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 1, h: 1 })
  const [resizePct, setResizePct] = useState(100)
  const [natural, setNatural] = useState({ w: file?.width ?? 0, h: file?.height ?? 0 })
  const imgRef = useRef<HTMLImageElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!file) return
    const existing = file.transforms?.[0]
    setRotate(existing?.rotate ?? 0)
    setResizePct(existing?.resize?.percent ?? 100)
    if (existing?.crop && file.width && file.height) {
      setCrop({
        x: existing.crop.x / file.width,
        y: existing.crop.y / file.height,
        w: existing.crop.width / file.width,
        h: existing.crop.height / file.height
      })
    } else {
      setCrop({ x: 0, y: 0, w: 1, h: 1 })
    }
  }, [file])

  const src = useMemo(() => (file ? mediaUrl(file.path) : ''), [file])

  const startDrag = (mode: 'move' | 'nw' | 'se') => (e: React.PointerEvent) => {
    e.preventDefault()
    const frame = frameRef.current
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    const start = { mx: e.clientX, my: e.clientY, ...crop }
    const onMove = (ev: PointerEvent): void => {
      const dx = (ev.clientX - start.mx) / rect.width
      const dy = (ev.clientY - start.my) / rect.height
      setCrop(() => {
        let { x, y, w, h } = start
        if (mode === 'move') {
          x = Math.min(Math.max(0, start.x + dx), 1 - w)
          y = Math.min(Math.max(0, start.y + dy), 1 - h)
        } else if (mode === 'nw') {
          x = Math.min(Math.max(0, start.x + dx), start.x + start.w - 0.05)
          y = Math.min(Math.max(0, start.y + dy), start.y + start.h - 0.05)
          w = start.w - (x - start.x)
          h = start.h - (y - start.y)
        } else {
          w = Math.min(Math.max(0.05, start.w + dx), 1 - start.x)
          h = Math.min(Math.max(0.05, start.h + dy), 1 - start.y)
        }
        return { x, y, w, h }
      })
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const apply = (): void => {
    if (!file) return
    const t: ImageTransform = {}
    if (crop.x > 0.001 || crop.y > 0.001 || crop.w < 0.999 || crop.h < 0.999) {
      t.crop = {
        x: Math.round(crop.x * natural.w),
        y: Math.round(crop.y * natural.h),
        width: Math.round(crop.w * natural.w),
        height: Math.round(crop.h * natural.h)
      }
    }
    if (rotate % 360 !== 0) {
      t.rotate = rotate
      t.rotateFit = 'expand'
    }
    if (resizePct !== 100) {
      t.resize = { mode: 'percent', percent: resizePct, lockAspect: true }
    }
    onApply(file.id, Object.keys(t).length ? [t] : [])
    onClose()
  }

  if (!file) return null

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex h-[86vh] w-[min(1000px,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Dialog.Title className="text-sm font-semibold">Edit · {file.name}</Dialog.Title>
            <button className="btn-ghost h-8 w-8 p-0" onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="flex flex-1 items-center justify-center bg-surface-2 p-6">
              <div
                ref={frameRef}
                className="relative max-h-full max-w-full select-none"
                style={{ lineHeight: 0 }}
              >
                <img
                  ref={imgRef}
                  src={src}
                  alt=""
                  draggable={false}
                  onLoad={(e) => {
                    const el = e.currentTarget
                    setNatural({ w: el.naturalWidth, h: el.naturalHeight })
                  }}
                  style={{ transform: `rotate(${rotate}deg)`, maxHeight: '62vh', maxWidth: '100%' }}
                />
                <div className="pointer-events-none absolute inset-0">
                  <div
                    className="pointer-events-auto absolute cursor-move border-2 border-brand shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                    style={{
                      left: `${crop.x * 100}%`,
                      top: `${crop.y * 100}%`,
                      width: `${crop.w * 100}%`,
                      height: `${crop.h * 100}%`
                    }}
                    onPointerDown={startDrag('move')}
                  >
                    <span
                      className="absolute -left-1.5 -top-1.5 h-3 w-3 cursor-nwse-resize rounded-full bg-brand"
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        startDrag('nw')(e)
                      }}
                    />
                    <span
                      className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-full bg-brand"
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        startDrag('se')(e)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="w-72 shrink-0 space-y-6 overflow-y-auto border-l border-border p-4">
              <div>
                <div className="label mb-2 flex justify-between">
                  <span>Rotate / tilt</span>
                  <span className="text-fg">{rotate}°</span>
                </div>
                <Slider.Root
                  className="relative flex h-5 items-center"
                  min={-180}
                  max={180}
                  step={1}
                  value={[rotate]}
                  onValueChange={([v]) => setRotate(v)}
                >
                  <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-surface-2">
                    <Slider.Range className="absolute h-full rounded-full bg-brand" />
                  </Slider.Track>
                  <Slider.Thumb className="block h-4 w-4 rounded-full border border-border bg-surface shadow" />
                </Slider.Root>
                <div className="mt-2 flex gap-2">
                  <button className="btn-outline flex-1 py-1.5" onClick={() => setRotate((r) => r - 90)}>
                    <RotateCcw size={14} />
                  </button>
                  <button className="btn-outline flex-1 py-1.5" onClick={() => setRotate((r) => r + 90)}>
                    <RotateCw size={14} />
                  </button>
                  <button className="btn-outline flex-1 py-1.5 text-xs" onClick={() => setRotate(0)}>
                    Reset
                  </button>
                </div>
              </div>

              <div>
                <div className="label mb-2 flex justify-between">
                  <span>Resize</span>
                  <span className="text-fg">{resizePct}%</span>
                </div>
                <Slider.Root
                  className="relative flex h-5 items-center"
                  min={10}
                  max={200}
                  step={5}
                  value={[resizePct]}
                  onValueChange={([v]) => setResizePct(v)}
                >
                  <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-surface-2">
                    <Slider.Range className="absolute h-full rounded-full bg-brand" />
                  </Slider.Track>
                  <Slider.Thumb className="block h-4 w-4 rounded-full border border-border bg-surface shadow" />
                </Slider.Root>
                {natural.w > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    ≈ {Math.round((natural.w * resizePct) / 100)}×
                    {Math.round((natural.h * resizePct) / 100)} px
                  </p>
                )}
              </div>

              <div>
                <div className="label mb-2">Crop</div>
                <p className="text-xs text-muted">
                  Drag the box on the image. Handles resize it.
                </p>
                <button
                  className="btn-outline mt-2 w-full py-1.5 text-xs"
                  onClick={() => setCrop({ x: 0, y: 0, w: 1, h: 1 })}
                >
                  Reset crop
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={apply}>
              <Check size={15} /> Apply
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
