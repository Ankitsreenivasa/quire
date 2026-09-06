import { FolderOpen } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function SettingsPage(): JSX.Element {
  const settings = useAppStore((s) => s.settings)
  const update = useAppStore((s) => s.updateSettings)
  if (!settings) return <div className="p-8" />

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <div className="card divide-y divide-border">
        <Row label="Output folder" hint="Where converted files are written.">
          <div className="flex items-center gap-2">
            <span className="max-w-[220px] truncate text-xs text-muted">{settings.outDir}</span>
            <button
              className="btn-outline py-1.5"
              onClick={async () => {
                const dir = await window.api.pickDir()
                if (dir) update({ outDir: dir })
              }}
            >
              <FolderOpen size={14} /> Change
            </button>
          </div>
        </Row>

        <Row label="Parallel jobs" hint="How many conversions run at once.">
          <input
            type="number"
            min={1}
            max={8}
            className="input w-20"
            value={settings.concurrency}
            onChange={(e) => update({ concurrency: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Row>

        <Row
          label="Ghostscript path"
          hint="Optional. If set, used for higher-quality PDF compression."
        >
          <div className="flex items-center gap-2">
            <input
              className="input w-56"
              placeholder="/usr/local/bin/gs"
              value={settings.ghostscriptPath ?? ''}
              onChange={(e) => update({ ghostscriptPath: e.target.value || undefined })}
            />
          </div>
        </Row>
      </div>

      <p className="mt-4 text-xs text-muted">
        Theme is set from the top bar. All processing happens locally — nothing is uploaded.
      </p>
    </div>
  )
}

function Row({
  label,
  hint,
  children
}: {
  label: string
  hint: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {children}
    </div>
  )
}
