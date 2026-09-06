import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Pen, Type, Upload, Eraser } from 'lucide-react'
import { cn, mediaUrl } from '@/lib/cn'

interface Props {
  onClose: () => void
  onDone: (dataUrl: string) => void
}

type Tab = 'draw' | 'type' | 'upload'

const W = 600
const H = 220

export function SignaturePad({ onClose, onDone }: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>('draw')
  const [typed, setTyped] = useState('')
  const [ink, setInk] = useState('#1b1b1b')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const dirty = useRef(false)

  const ctx = (): CanvasRenderingContext2D | null => canvasRef.current?.getContext('2d') ?? null

  const pos = (e: React.PointerEvent): { x: number; y: number } => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }

  const start = (e: React.PointerEvent): void => {
    drawing.current = true
    const c = ctx()
    if (!c) return
    const p = pos(e)
    c.strokeStyle = ink
    c.lineWidth = 3
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.beginPath()
    c.moveTo(p.x, p.y)
  }
  const move = (e: React.PointerEvent): void => {
    if (!drawing.current) return
    const c = ctx()
    if (!c) return
    const p = pos(e)
    c.lineTo(p.x, p.y)
    c.stroke()
    dirty.current = true
  }
  const end = (): void => {
    drawing.current = false
  }

  const clear = (): void => {
    const c = ctx()
    if (c) c.clearRect(0, 0, W, H)
    dirty.current = false
  }

  const typedToDataUrl = (): string => {
    const cv = document.createElement('canvas')
    cv.width = W
    cv.height = H
    const c = cv.getContext('2d')!
    c.fillStyle = ink
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.font = "64px 'Fraunces', Georgia, serif"
    c.fillText(typed || 'Signature', W / 2, H / 2)
    return cv.toDataURL('image/png')
  }

  const confirm = async (): Promise<void> => {
    if (tab === 'draw') {
      if (!dirty.current) return
      onDone(canvasRef.current!.toDataURL('image/png'))
    } else if (tab === 'type') {
      if (!typed.trim()) return
      onDone(typedToDataUrl())
    }
    onClose()
  }

  const pickUpload = async (): Promise<void> => {
    const picked = await window.api.pickFiles([
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
    ])
    if (!picked[0]) return
    // load through media:// and re-export as PNG so the job always gets PNG
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const cv = document.createElement('canvas')
      const scale = Math.min(1, 1200 / img.naturalWidth)
      cv.width = img.naturalWidth * scale
      cv.height = img.naturalHeight * scale
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height)
      onDone(cv.toDataURL('image/png'))
      onClose()
    }
    img.src = mediaUrl(picked[0])
  }

  const TABS: { id: Tab; label: string; icon: typeof Pen }[] = [
    { id: 'draw', label: 'Draw', icon: Pen },
    { id: 'type', label: 'Type', icon: Type },
    { id: 'upload', label: 'Upload', icon: Upload }
  ]

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[61] w-[min(680px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold">Create signature</Dialog.Title>
            <button className="btn-ghost h-8 w-8 p-0" onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          <div className="mb-3 flex gap-1 rounded-lg bg-surface-2 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  tab === t.id ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
                )}
              >
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'draw' && (
            <div>
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={end}
                onPointerLeave={end}
                className="w-full cursor-crosshair touch-none rounded-lg border border-border bg-white"
              />
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={ink}
                  onChange={(e) => setInk(e.target.value)}
                  className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent"
                />
                <button className="btn-ghost text-xs" onClick={clear}>
                  <Eraser size={13} /> Clear
                </button>
              </div>
            </div>
          )}

          {tab === 'type' && (
            <div>
              <input
                className="input font-display text-2xl"
                placeholder="Type your name"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={ink}
                  onChange={(e) => setInk(e.target.value)}
                  className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent"
                />
                <span className="text-xs text-muted">Rendered in the display serif.</span>
              </div>
            </div>
          )}

          {tab === 'upload' && (
            <button className="btn-outline w-full py-8" onClick={pickUpload}>
              <Upload size={16} /> Choose an image of your signature
            </button>
          )}

          {tab !== 'upload' && (
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary" onClick={confirm}>
                Use signature
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
