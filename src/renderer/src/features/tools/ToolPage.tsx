import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import type { ImageTransform, InputFile, JobProgress, JobResult } from '@shared/types'
import { defaultOptions, getTool, type FieldValue } from '@/tools/registry'
import { uid } from '@/lib/cn'
import { Dropzone } from '@/components/Dropzone'
import { FileList } from '@/components/FileList'
import { OptionsPanel } from '@/components/OptionsPanel'
import { ProgressView } from '@/components/ProgressView'
import { ResultView } from '@/components/ResultView'
import { ImageEditor } from '@/features/editor/ImageEditor'
import { PreviewModal } from '@/components/PreviewModal'
import { PageGrid, type PageItem } from './PageGrid'
import { WatermarkEditor } from './WatermarkEditor'
import { useAppStore } from '@/store/useAppStore'

const STRING_KEYS = new Set(['pages', 'ranges', 'extract', 'format', 'text', 'imagePath', 'position'])

function coerce(options: Record<string, FieldValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(options)) {
    if (typeof v === 'string' && !STRING_KEYS.has(k) && /^-?\d+(\.\d+)?$/.test(v)) out[k] = Number(v)
    else out[k] = v
  }
  return out
}

export function ToolPage(): JSX.Element {
  const { toolId = '' } = useParams()
  const tool = getTool(toolId)
  const refreshHistory = useAppStore((s) => s.refreshHistory)

  const [files, setFiles] = useState<InputFile[]>([])
  const [options, setOptions] = useState<Record<string, FieldValue>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [pageItems, setPageItems] = useState<PageItem[]>([])
  const [phase, setPhase] = useState<'setup' | 'running' | 'done'>('setup')
  const [progress, setProgress] = useState<JobProgress | null>(null)
  const [result, setResult] = useState<JobResult | null>(null)
  const jobIdRef = useRef<string>('')

  useEffect(() => {
    if (tool) setOptions(defaultOptions(tool))
    setFiles([])
    setPhase('setup')
    setResult(null)
  }, [tool])

  useEffect(() => {
    return window.api.onJobProgress((p) => {
      if (p.jobId === jobIdRef.current) setProgress(p)
    })
  }, [])

  // Test / automation seam: inject real file paths without the native dialog.
  useEffect(() => {
    ;(window as unknown as { __addFiles?: (p: string[]) => void }).__addFiles = async (paths) => {
      const probed = await window.api.probeFiles(paths)
      setFiles((cur) => {
        const seen = new Set(cur.map((f) => f.path))
        return [...cur, ...probed.filter((f) => !seen.has(f.path))]
      })
    }
  }, [])

  const canRun = useMemo(
    () => !!tool && files.length >= tool.minFiles,
    [tool, files.length]
  )

  if (!tool) {
    return (
      <div className="p-10 text-center text-sm text-muted">
        Unknown tool. <Link to="/" className="text-brand underline">Go home</Link>
      </div>
    )
  }

  const addFiles = async (paths: string[]): Promise<void> => {
    const probed = await window.api.probeFiles(paths)
    setFiles((cur) => {
      const seen = new Set(cur.map((f) => f.path))
      const merged = [...cur, ...probed.filter((f) => !seen.has(f.path))]
      return tool.multiple ? merged : merged.slice(-1)
    })
  }

  const move = (id: string, dir: -1 | 1): void =>
    setFiles((cur) => {
      const i = cur.findIndex((f) => f.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= cur.length) return cur
      const next = [...cur]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const applyTransforms = (id: string, transforms: ImageTransform[]): void =>
    setFiles((cur) => cur.map((f) => (f.id === id ? { ...f, transforms } : f)))

  const run = async (): Promise<void> => {
    const jobId = uid()
    jobIdRef.current = jobId
    setPhase('running')
    setProgress({ jobId, status: 'running', progress: 0 })

    let opts = coerce(options)
    if (tool.organize) {
      const order = pageItems
        .filter((it) => !it.deleted)
        .map((it) => ({ page: it.globalPage, rotate: it.rotate }))
      opts = { order }
    }

    const res = await window.api.runJob({
      jobId,
      toolId: tool.id,
      files,
      options: opts
    })
    setResult(res)
    setPhase('done')
    void refreshHistory()
  }

  const reset = (): void => {
    setFiles([])
    setPageItems([])
    setResult(null)
    setPhase('setup')
    setOptions(defaultOptions(tool))
  }

  const editingFile = files.find((f) => f.id === editingId) ?? null

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg">
        <ArrowLeft size={14} /> All tools
      </Link>
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand">
          <tool.icon size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{tool.name}</h1>
          <p className="mt-0.5 text-sm text-muted">{tool.description}</p>
        </div>
      </div>

      <div className="mt-6">
        {phase === 'running' && progress && (
          <ProgressView
            label={`${tool.name}…`}
            progress={progress.progress}
            message={progress.message}
            onCancel={() => {
              window.api.cancelJob(jobIdRef.current)
              setPhase('setup')
            }}
          />
        )}

        {phase === 'done' && result && <ResultView result={result} onReset={reset} />}

        {phase === 'setup' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-4">
              {files.length === 0 ? (
                <Dropzone accept={tool.accept} multiple={tool.multiple} onFiles={addFiles} />
              ) : (
                <>
                  {tool.organize ? (
                    <PageGrid files={files} items={pageItems} setItems={setPageItems} />
                  ) : tool.interactive === 'watermark' ? (
                    <>
                      <FileList
                        files={files}
                        onRemove={(id) => setFiles((c) => c.filter((f) => f.id !== id))}
                        onMove={move}
                        onView={(id) => setViewingId(id)}
                      />
                      <WatermarkEditor
                        file={files[0]}
                        values={options}
                        onChange={(patch) => setOptions((o) => ({ ...o, ...patch }))}
                      />
                    </>
                  ) : (
                    <FileList
                      files={files}
                      reorder={tool.reorder}
                      editable={tool.editable}
                      onRemove={(id) => setFiles((c) => c.filter((f) => f.id !== id))}
                      onMove={move}
                      onEdit={(id) => setEditingId(id)}
                      onView={(id) => setViewingId(id)}
                    />
                  )}
                  {tool.multiple && (
                    <Dropzone accept={tool.accept} multiple onFiles={addFiles} compact />
                  )}
                </>
              )}
            </div>

            <aside className="space-y-4">
              <div className="card p-4">
                <h2 className="mb-3 text-sm font-semibold">Options</h2>
                <OptionsPanel
                  tool={tool}
                  values={options}
                  onChange={(k, v) => setOptions((o) => ({ ...o, [k]: v }))}
                />
              </div>
              <button className="btn-primary w-full" disabled={!canRun} onClick={run}>
                <Play size={15} /> {tool.primaryLabel}
              </button>
              {!canRun && files.length > 0 && (
                <p className="text-center text-xs text-muted">
                  Add at least {tool.minFiles} file{tool.minFiles > 1 ? 's' : ''}.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>

      {editingFile && (
        <ImageEditor
          file={editingFile}
          onClose={() => setEditingId(null)}
          onApply={applyTransforms}
        />
      )}

      <PreviewModal
        path={files.find((f) => f.id === viewingId)?.path ?? null}
        onClose={() => setViewingId(null)}
      />
    </div>
  )
}
