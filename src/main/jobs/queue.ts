import { EventEmitter } from 'events'
import type { JobProgress, JobRequest, JobResult } from '../../shared/types'
import { getSettings, addHistory } from '../store'
import { RUNNERS, TOOL_NAMES } from './registry'
import type { JobContext } from './types'

interface Pending {
  req: JobRequest
  resolve: (r: JobResult) => void
}

class JobQueue extends EventEmitter {
  private pending: Pending[] = []
  private active = new Map<string, AbortController>()

  submit(req: JobRequest): Promise<JobResult> {
    return new Promise<JobResult>((resolve) => {
      this.pending.push({ req, resolve })
      this.emitProgress({ jobId: req.jobId, status: 'queued', progress: 0 })
      this.pump()
    })
  }

  cancel(jobId: string): void {
    this.active.get(jobId)?.abort()
    this.pending = this.pending.filter((p) => p.req.jobId !== jobId)
  }

  private pump(): void {
    const concurrency = Math.max(1, getSettings().concurrency || 2)
    while (this.active.size < concurrency && this.pending.length) {
      const next = this.pending.shift()!
      void this.run(next.req, next.resolve)
    }
  }

  private async run(req: JobRequest, done: (r: JobResult) => void): Promise<void> {
    const controller = new AbortController()
    this.active.set(req.jobId, controller)
    const settings = getSettings()
    const startedAt = Date.now()
    this.emitProgress({ jobId: req.jobId, status: 'running', progress: 0 })

    const ctx: JobContext = {
      outDir: req.outDir || settings.outDir,
      settings,
      signal: controller.signal,
      onProgress: (progress, message) =>
        this.emitProgress({ jobId: req.jobId, status: 'running', progress, message })
    }

    let result: JobResult
    try {
      const runner = RUNNERS[req.toolId]
      if (!runner) throw new Error(`Unknown tool: ${req.toolId}`)
      const files = await runner(req, ctx)
      result = {
        jobId: req.jobId,
        status: 'done',
        files,
        outDir: ctx.outDir,
        startedAt,
        finishedAt: Date.now(),
        toolId: req.toolId
      }
      this.emitProgress({ jobId: req.jobId, status: 'done', progress: 1 })
    } catch (err) {
      const canceled = (err as Error)?.name === 'AbortError'
      result = {
        jobId: req.jobId,
        status: canceled ? 'canceled' : 'error',
        files: [],
        outDir: ctx.outDir,
        error: canceled ? undefined : (err as Error)?.message ?? String(err),
        startedAt,
        finishedAt: Date.now(),
        toolId: req.toolId
      }
      this.emitProgress({
        jobId: req.jobId,
        status: result.status,
        progress: 0,
        message: result.error
      })
    }

    this.active.delete(req.jobId)
    if (result.status === 'done') {
      addHistory({ ...result, toolName: TOOL_NAMES[req.toolId] })
    }
    done(result)
    this.pump()
  }

  private emitProgress(p: JobProgress): void {
    this.emit('progress', p)
  }
}

export const jobQueue = new JobQueue()
