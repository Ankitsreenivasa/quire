import { useEffect, useState } from 'react'
import { RotateCw, Trash2, Undo2, Loader2 } from 'lucide-react'
import type { InputFile } from '@shared/types'

export interface PageItem {
  uid: string
  globalPage: number // 1-based index into concatenation of all files
  thumb: string
  rotate: number
  deleted: boolean
}

interface Props {
  files: InputFile[]
  items: PageItem[]
  setItems: (items: PageItem[]) => void
}

export function PageGrid({ files, items, setItems }: Props): JSX.Element {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      setLoading(true)
      const collected: PageItem[] = []
      let offset = 0
      for (const f of files) {
        const thumbs = await window.api.renderPdf(f.path, 240)
        if (cancelled) return
        thumbs.forEach((t) => {
          collected.push({
            uid: `${f.id}:${t.page}`,
            globalPage: offset + t.page,
            thumb: t.dataUrl,
            rotate: 0,
            deleted: false
          })
        })
        offset += thumbs.length
      }
      if (!cancelled) {
        setItems(collected)
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.map((f) => f.id).join(',')])

  const update = (uid: string, patch: Partial<PageItem>): void =>
    setItems(items.map((it) => (it.uid === uid ? { ...it, ...patch } : it)))

  const move = (index: number, dir: -1 | 1): void => {
    const next = [...items]
    const j = index + dir
    if (j < 0 || j >= next.length) return
    ;[next[index], next[j]] = [next[j], next[index]]
    setItems(next)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Rendering pages…
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((it, i) => (
        <div
          key={it.uid}
          className={`card group relative overflow-hidden p-2 ${it.deleted ? 'opacity-40' : ''}`}
        >
          <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded bg-surface-2">
            <img
              src={it.thumb}
              alt=""
              className="max-h-full max-w-full transition-transform"
              style={{ transform: `rotate(${it.rotate}deg)` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted">#{i + 1}</span>
            <div className="flex gap-0.5">
              <button className="btn-ghost h-6 w-6 p-0" onClick={() => move(i, -1)} title="Move left">
                ‹
              </button>
              <button className="btn-ghost h-6 w-6 p-0" onClick={() => move(i, 1)} title="Move right">
                ›
              </button>
              <button
                className="btn-ghost h-6 w-6 p-0"
                onClick={() => update(it.uid, { rotate: (it.rotate + 90) % 360 })}
                title="Rotate"
              >
                <RotateCw size={12} />
              </button>
              <button
                className="btn-ghost h-6 w-6 p-0"
                onClick={() => update(it.uid, { deleted: !it.deleted })}
                title={it.deleted ? 'Restore' : 'Delete'}
              >
                {it.deleted ? <Undo2 size={12} /> : <Trash2 size={12} />}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
