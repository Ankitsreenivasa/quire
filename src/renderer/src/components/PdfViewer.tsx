import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { mediaUrl } from '@/lib/cn'

interface Props {
  /** local file path of the PDF */
  path: string
  className?: string
}

/**
 * Uses Chromium's built-in PDF viewer (PDFium) via an iframe — vector-crisp at
 * any zoom, with its own toolbar, scroll and text selection. No rasterisation.
 */
export function PdfViewer({ path, className }: Props): JSX.Element {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={className}>
      <div className="relative h-[72vh] overflow-hidden rounded-lg bg-surface-2">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
          </div>
        )}
        <iframe
          title="PDF preview"
          src={`${mediaUrl(path)}#toolbar=1&navpanes=0&view=FitH`}
          className="h-full w-full border-0"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  )
}
