import { useState } from 'react'
import { CheckCircle2, Download, FolderOpen, RotateCcw, FileDown, AlertCircle } from 'lucide-react'
import type { JobResult } from '@shared/types'
import { formatBytes } from '@/lib/cn'

interface Props {
  result: JobResult
  onReset: () => void
}

export function ResultView({ result, onReset }: Props): JSX.Element {
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

  const total = result.files.reduce((s, f) => s + f.size, 0)

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-7 w-7 text-emerald-500" />
        <div className="min-w-0">
          <p className="font-semibold">Done — {result.files.length} file{result.files.length > 1 ? 's' : ''}</p>
          <p className="truncate text-xs text-muted">{formatBytes(total)} · saved to {result.outDir}</p>
        </div>
      </div>

      <ul className="my-5 max-h-64 space-y-1.5 overflow-y-auto">
        {result.files.map((f) => (
          <li
            key={f.path}
            className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 truncate">{f.name}</span>
            <span className="ml-3 shrink-0 text-xs text-muted">{formatBytes(f.size)}</span>
            <button
              className="btn-ghost ml-1 h-7 w-7 p-0"
              title="Reveal in folder"
              onClick={() => window.api.revealPath(f.path)}
            >
              <FolderOpen size={14} />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => window.api.revealPath(result.files[0]?.path)}>
          <FolderOpen size={15} /> Open folder
        </button>
        <button className="btn-outline" onClick={() => window.api.openPath(result.files[0]?.path)}>
          <FileDown size={15} /> Open first file
        </button>
        <button
          className="btn-outline"
          onClick={async () => {
            const res = await window.api.saveResults(result.files)
            if (res.dir) setSavedDir(res.dir)
          }}
        >
          <Download size={15} /> Copy elsewhere…
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
