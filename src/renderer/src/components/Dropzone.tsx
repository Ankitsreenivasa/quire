import { useCallback, useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  accept: string[]
  multiple: boolean
  onFiles: (paths: string[]) => void
  compact?: boolean
}

export function Dropzone({ accept, multiple, onFiles, compact }: Props): JSX.Element {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filterPaths = useCallback(
    (paths: string[]) => {
      const set = new Set(accept.map((e) => e.toLowerCase()))
      const ok = paths.filter((p) => set.has(p.split('.').pop()?.toLowerCase() ?? ''))
      if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1))
    },
    [accept, multiple, onFiles]
  )

  const pick = useCallback(async () => {
    const paths = await window.api.pickFiles([
      { name: 'Supported files', extensions: accept },
      { name: 'All files', extensions: ['*'] }
    ])
    filterPaths(paths)
  }, [accept, filterPaths])

  return (
    <div
      onClick={pick}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const paths = Array.from(e.dataTransfer.files)
          .map((f) => (f as File & { path?: string }).path)
          .filter((p): p is string => !!p)
        filterPaths(paths)
      }}
      className={cn(
        'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface text-center transition-colors hover:border-brand/60 hover:bg-surface-2',
        over && 'border-brand bg-brand/5',
        compact ? 'gap-1 p-4' : 'gap-3 p-12'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept.map((e) => `.${e}`).join(',')}
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const paths = Array.from(e.target.files ?? [])
            .map((f) => (f as File & { path?: string }).path)
            .filter((p): p is string => !!p)
          filterPaths(paths)
          e.target.value = ''
        }}
      />
      <UploadCloud className={cn('text-brand', compact ? 'h-5 w-5' : 'h-10 w-10')} />
      <div>
        <p className={cn('font-medium', compact ? 'text-sm' : 'text-base')}>
          {compact ? 'Add more files' : 'Drop files here or click to browse'}
        </p>
        {!compact && (
          <p className="mt-1 text-xs text-muted">
            {accept.slice(0, 8).map((e) => e.toUpperCase()).join(' · ')}
          </p>
        )}
      </div>
    </div>
  )
}
