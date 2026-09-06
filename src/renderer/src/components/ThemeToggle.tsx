import { Monitor, Moon, Sun } from 'lucide-react'
import type { ThemeMode } from '@shared/types'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/cn'

const OPTIONS: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
  { mode: 'light', icon: Sun, label: 'Light' },
  { mode: 'dark', icon: Moon, label: 'Dark' },
  { mode: 'system', icon: Monitor, label: 'System' }
]

export function ThemeToggle(): JSX.Element {
  const theme = useAppStore((s) => s.settings?.theme ?? 'system')
  const setTheme = useAppStore((s) => s.setTheme)
  return (
    <div className="flex gap-0.5 rounded-lg bg-surface-2 p-0.5 no-drag">
      {OPTIONS.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          title={label}
          onClick={() => setTheme(mode)}
          className={cn(
            'rounded-md p-1.5 transition-colors',
            theme === mode ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-fg'
          )}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  )
}
