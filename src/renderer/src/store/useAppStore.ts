import { create } from 'zustand'
import type { AppSettings, HistoryEntry, ThemeMode } from '@shared/types'

interface AppState {
  settings: AppSettings | null
  history: HistoryEntry[]
  resolvedDark: boolean
  init: () => Promise<void>
  setTheme: (mode: ThemeMode) => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  refreshHistory: () => Promise<void>
  clearHistory: () => Promise<void>
}

function applyTheme(mode: ThemeMode): boolean {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = mode === 'dark' || (mode === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', dark)
  return dark
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: null,
  history: [],
  resolvedDark: false,

  init: async () => {
    const settings = await window.api.getSettings()
    const resolvedDark = applyTheme(settings.theme)
    await window.api.setNativeTheme(settings.theme)
    set({ settings, resolvedDark })

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const s = get().settings
      if (s?.theme === 'system') set({ resolvedDark: applyTheme('system') })
    })

    const history = await window.api.getHistory()
    set({ history })
  },

  setTheme: async (mode) => {
    const resolvedDark = applyTheme(mode)
    await window.api.setNativeTheme(mode)
    const settings = await window.api.setSettings({ theme: mode })
    set({ settings, resolvedDark })
  },

  updateSettings: async (patch) => {
    const settings = await window.api.setSettings(patch)
    set({ settings })
  },

  refreshHistory: async () => set({ history: await window.api.getHistory() }),
  clearHistory: async () => set({ history: await window.api.clearHistory() })
}))
