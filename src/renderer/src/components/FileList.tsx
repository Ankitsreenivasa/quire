import { ArrowUp, ArrowDown, X, Crop, FileText } from 'lucide-react'
import type { InputFile } from '@shared/types'
import { formatBytes, formatDuration } from '@/lib/cn'

interface Props {
  files: InputFile[]
  reorder?: boolean
  editable?: boolean
  onRemove: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onEdit?: (id: string) => void
}

export function FileList({ files, reorder, editable, onRemove, onMove, onEdit }: Props): JSX.Element {
  return (
    <ul className="space-y-2">
      {files.map((f, i) => {
        const edited = (f.transforms?.length ?? 0) > 0
        return (
          <li key={f.id} className="card flex items-center gap-3 p-2.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2">
              {f.thumb ? (
                <img src={f.thumb} alt="" className="h-full w-full object-cover" />
              ) : (
                <FileText className="h-6 w-6 text-muted" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{f.name}</p>
              <p className="text-xs text-muted">
                {formatBytes(f.size)}
                {f.pages ? ` · ${f.pages} pages` : ''}
                {f.width && f.height ? ` · ${f.width}×${f.height}` : ''}
                {f.duration ? ` · ${formatDuration(f.duration)}` : ''}
                {edited ? ' · edited' : ''}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {editable && onEdit && (
                <button
                  className="btn-ghost h-8 w-8 p-0"
                  title="Crop, rotate, resize"
                  onClick={() => onEdit(f.id)}
                >
                  <Crop size={15} />
                </button>
              )}
              {reorder && (
                <>
                  <button
                    className="btn-ghost h-8 w-8 p-0 disabled:opacity-30"
                    disabled={i === 0}
                    onClick={() => onMove(f.id, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    className="btn-ghost h-8 w-8 p-0 disabled:opacity-30"
                    disabled={i === files.length - 1}
                    onClick={() => onMove(f.id, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                </>
              )}
              <button className="btn-ghost h-8 w-8 p-0 text-muted hover:text-brand" onClick={() => onRemove(f.id)}>
                <X size={16} />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
