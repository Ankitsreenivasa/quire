import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { FilePreview } from './FilePreview'

interface Props {
  path: string | null
  title?: string
  onClose: () => void
}

export function PreviewModal({ path, title, onClose }: Props): JSX.Element | null {
  if (!path) return null
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(1100px,95vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <Dialog.Title className="truncate text-sm font-semibold">
              {title ?? path.split(/[/\\]/).pop()}
            </Dialog.Title>
            <button className="btn-ghost h-8 w-8 p-0" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
          <FilePreview path={path} className="min-h-0 flex-1" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
