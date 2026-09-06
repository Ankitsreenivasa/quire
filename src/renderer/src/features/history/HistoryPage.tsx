import { FolderOpen, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { formatBytes } from '@/lib/cn'
import { Page } from '@/components/Page'

export function HistoryPage(): JSX.Element {
  const history = useAppStore((s) => s.history)
  const clearHistory = useAppStore((s) => s.clearHistory)

  return (
    <Page width="form">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">History</h1>
        {history.length > 0 && (
          <button className="btn-ghost text-muted" onClick={() => clearHistory()}>
            <Trash2 size={14} /> Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted">No jobs yet.</p>
      ) : (
        <ul className="space-y-2">
          {history.map((h) => (
            <li key={h.jobId} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{h.toolName}</p>
                <p className="text-xs text-muted">
                  {new Date(h.finishedAt).toLocaleString()} · {h.files.length} file
                  {h.files.length > 1 ? 's' : ''} ·{' '}
                  {formatBytes(h.files.reduce((s, f) => s + f.size, 0))}
                </p>
              </div>
              <button
                className="btn-ghost h-8 w-8 p-0"
                onClick={() => h.files[0] && window.api.revealPath(h.files[0].path)}
              >
                <FolderOpen size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
