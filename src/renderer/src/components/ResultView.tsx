import { useState } from 'react'
import {
  CheckCircle2,
  Download,
  FolderOpen,
  RotateCcw,
  Pencil,
  Check,
  X,
  AlertCircle,
  FileText
} from 'lucide-react'
import type { JobResult, JobResultFile } from '@shared/types'
import { formatBytes, cn } from '@/lib/cn'
import { FilePreview } from './FilePreview'

interface Props {
  result: JobResult
  onReset: () => void
}

export function ResultView({ result, onReset }: Props): JSX.Element {
  const [files, setFiles] = useState<JobResultFile[]>(result.files)
  const [selected, setSelected] = useState(0)
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [savedDir, setSavedDir] = useState<string | null>(null)

  if (result.status === 'error') {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-brand" />
        <p className="font-medium">Something went wrong</p>
        <p className="max-w-md text-xs text-muted">{result.error}</p>
        <button className="btn-primary mt-2" onClick={onReset}>
          <RotateCcw size={15} /> Try again
        </button>
      </div>
    )
  }

  const active = files[selected]
  const total = files.reduce((s, f) => s + f.size, 0)

  const commitRename = async (i: number): Promise<void> => {
    const name = draft.trim()
    setEditing(null)
    if (!name || name === files[i].name) return
    const updated = await window.api.renameResult(files[i].path, name)
    setFiles((cur) => cur.map((f, idx) => (idx === i ? updated : f)))
  }

  const download = async (subset: JobResultFile[]): Promise<void> => {
    const res = await window.api.saveResults(subset)
    if (res.dir) setSavedDir(res.dir)
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-7 w-7 text-emerald-500" />
        <div className="min-w-0">
          <p className="font-semibold">
            Preview your {files.length > 1 ? `${files.length} results` : 'result'}
          </p>
          <p className="truncate text-xs text-muted">
            {formatBytes(total)} · staged in {result.outDir}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* file list + rename */}
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li
              key={f.path}
              className={cn(
                'rounded-lg border px-2.5 py-2 text-sm transition-colors',
                i === selected ? 'border-brand bg-brand/5' : 'border-border hover:bg-surface-2'
              )}
            >
              {editing === i ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    className="input h-8 py-1 text-xs"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void commitRename(i)
                      if (e.key === 'Escape') setEditing(null)
                    }}
                  />
                  <button className="btn-ghost h-7 w-7 shrink-0 p-0" onClick={() => void commitRename(i)}>
                    <Check size={14} />
                  </button>
                  <button className="btn-ghost h-7 w-7 shrink-0 p-0" onClick={() => setEditing(null)}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    onClick={() => setSelected(i)}
                  >
                    <FileText size={13} className="shrink-0 text-muted" />
                    <span className="truncate">{f.name}</span>
                  </button>
                  <button
                    className="btn-ghost h-6 w-6 shrink-0 p-0 text-muted"
                    title="Rename"
                    onClick={() => {
                      setSelected(i)
                      setDraft(f.name.replace(/\.[^.]+$/, ''))
                      setEditing(i)
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              )}
              <p className="mt-0.5 pl-5 text-[11px] text-muted">{formatBytes(f.size)}</p>
            </li>
          ))}
        </ul>

        {/* preview */}
        {active && <FilePreview key={active.path} path={active.path} />}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => active && download([active])}>
          <Download size={15} /> Download “{active?.name}”
        </button>
        {files.length > 1 && (
          <button className="btn-outline" onClick={() => download(files)}>
            <Download size={15} /> Download all ({files.length})
          </button>
        )}
        <button
          className="btn-outline"
          onClick={() => active && window.api.revealPath(active.path)}
        >
          <FolderOpen size={15} /> Show in folder
        </button>
        <button className="btn-ghost" onClick={onReset}>
          <RotateCcw size={15} /> Start over
        </button>
      </div>

      {savedDir && (
        <p className="mt-3 text-xs text-emerald-500">
          Saved to {savedDir}.{' '}
          <button className="underline" onClick={() => window.api.revealPath(savedDir)}>
            Reveal
          </button>
        </p>
      )}
    </div>
  )
}
