export type ThemeMode = 'light' | 'dark' | 'system'

export type ToolCategory =
  | 'organize'
  | 'optimize'
  | 'convert'
  | 'edit'
  | 'media'

export type ToolId =
  | 'images-to-pdf'
  | 'pdf-to-image'
  | 'merge-pdf'
  | 'split-pdf'
  | 'compress-pdf'
  | 'rotate-pdf'
  | 'page-numbers'
  | 'watermark-pdf'
  | 'organize-pdf'
  | 'crop-pdf'
  | 'sign-pdf'
  | 'protect-pdf'
  | 'unlock-pdf'
  | 'edit-pdf'
  | 'image-compress'
  | 'video-compress'

/** A single annotation drawn on top of a PDF page by the Edit PDF tool. */
export interface PdfAnnotation {
  id: string
  /** 1-based page number */
  page: number
  type: 'text' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'draw' | 'highlight' | 'image'
  /** bounding box in PDF points; x,y is the top-left corner, y measured from the page top */
  x: number
  y: number
  w: number
  h: number
  color: string
  fill?: boolean
  strokeWidth?: number
  opacity?: number
  text?: string
  fontSize?: number
  /** freehand points, relative to (x,y), in points */
  points?: { x: number; y: number }[]
  /** local path for an image annotation */
  imagePath?: string
}

/** A file the user has added to a tool, as seen by the renderer. */
export interface InputFile {
  id: string
  path: string
  name: string
  ext: string
  size: number
  /** data URL for a small preview thumbnail, when available */
  thumb?: string
  /** page count for PDFs */
  pages?: number
  width?: number
  height?: number
  /** video duration in seconds */
  duration?: number
  /** ordered image transforms applied before the job runs */
  transforms?: ImageTransform[]
}

export interface ImageTransform {
  /** rectangular crop in source-pixel units */
  crop?: { x: number; y: number; width: number; height: number }
  /** free rotation in degrees, positive = clockwise */
  rotate?: number
  /** how to handle the canvas after a non-90 rotation */
  rotateFit?: 'expand' | 'crop'
  /** target size; percent is relative to (possibly cropped) source */
  resize?: { mode: 'px' | 'percent'; width?: number; height?: number; percent?: number; lockAspect?: boolean }
}

export type JobStatus = 'queued' | 'running' | 'done' | 'error' | 'canceled'

export interface JobProgress {
  jobId: string
  status: JobStatus
  /** 0..1 */
  progress: number
  message?: string
}

export interface JobResultFile {
  path: string
  name: string
  size: number
}

export interface JobResult {
  jobId: string
  status: JobStatus
  files: JobResultFile[]
  outDir: string
  error?: string
  startedAt: number
  finishedAt: number
  toolId: ToolId
}

/** Options payloads, keyed by tool. Kept loose; each job validates its own. */
export interface JobRequest<T = Record<string, unknown>> {
  jobId: string
  toolId: ToolId
  files: InputFile[]
  options: T
  /** output directory; when omitted the main process uses the configured default */
  outDir?: string
}

export interface RenderedPage {
  page: number
  /** JPEG data URL, or '' when the page could not be rasterised */
  dataUrl: string
  width: number
  height: number
  failed?: boolean
}

export interface AppSettings {
  theme: ThemeMode
  outDir: string
  concurrency: number
  ghostscriptPath?: string
}

export interface HistoryEntry extends JobResult {
  toolName: string
}

/** IPC channel names. */
export const IPC = {
  runJob: 'job:run',
  cancelJob: 'job:cancel',
  jobProgress: 'job:progress',
  probeFiles: 'files:probe',
  renderPdf: 'pdf:render',
  saveTempImage: 'media:saveTemp',
  pickFiles: 'dialog:pickFiles',
  pickDir: 'dialog:pickDir',
  saveResults: 'results:save',
  renameResult: 'results:rename',
  revealPath: 'shell:reveal',
  openPath: 'shell:open',
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  getHistory: 'history:get',
  clearHistory: 'history:clear',
  setNativeTheme: 'theme:setNative'
} as const
