import { Loader2, X } from 'lucide-react'

interface Props {
  progress: number
  message?: string
  label: string
  onCancel: () => void
}

export function ProgressView({ progress, message, label, onCancel }: Props): JSX.Element {
  const pct = Math.round(progress * 100)
  return (
    <div className="card flex flex-col items-center gap-4 p-10 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted">{message || `${pct}%`}</p>
      </div>
      <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300"
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
      <button className="btn-ghost text-muted" onClick={onCancel}>
        <X size={15} /> Cancel
      </button>
    </div>
  )
}
