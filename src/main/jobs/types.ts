import type { AppSettings, JobRequest, JobResultFile } from '../../shared/types'

export interface JobContext {
  outDir: string
  settings: AppSettings
  signal: AbortSignal
  /** progress is 0..1 */
  onProgress: (progress: number, message?: string) => void
}

export type JobRunner = (req: JobRequest, ctx: JobContext) => Promise<JobResultFile[]>

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    const err = new Error('canceled')
    err.name = 'AbortError'
    throw err
  }
}
