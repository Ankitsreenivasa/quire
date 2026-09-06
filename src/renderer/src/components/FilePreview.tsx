import { FileText } from 'lucide-react'
import { PdfViewer } from './PdfViewer'
import { mediaUrl } from '@/lib/cn'

const IMG = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif', 'bmp', 'gif', 'heic', 'heif']
const VIDEO = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v']

export function FilePreview({ path, className }: { path: string; className?: string }): JSX.Element {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const url = mediaUrl(path)

  if (ext === 'pdf') return <PdfViewer url={url} className={className} />

  if (IMG.includes(ext)) {
    return (
      <div className={className}>
        <div className="flex max-h-[70vh] justify-center overflow-auto rounded-lg bg-surface-2 p-4">
          <img src={url} alt="" className="max-w-full rounded shadow-card" />
        </div>
      </div>
    )
  }

  if (VIDEO.includes(ext)) {
    return (
      <div className={className}>
        <div className="flex justify-center rounded-lg bg-surface-2 p-4">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={url} controls className="max-h-[70vh] max-w-full rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-2 rounded-lg bg-surface-2 p-10 text-sm text-muted">
        <FileText className="h-8 w-8" />
        No preview available for .{ext}
      </div>
    </div>
  )
}
