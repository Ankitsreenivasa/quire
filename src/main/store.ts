import { app } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import type { AppSettings, HistoryEntry } from '../shared/types'

interface Schema {
  settings: AppSettings
  history: HistoryEntry[]
}

const defaults: Schema = {
  settings: {
    theme: 'system',
    outDir: join(app.getPath('downloads'), 'PDF Converter'),
    concurrency: 2
  },
  history: []
}

const store = new Store<Schema>({ defaults })

export function getSettings(): AppSettings {
  return store.get('settings')
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...store.get('settings'), ...patch }
  store.set('settings', next)
  return next
}

export function getHistory(): HistoryEntry[] {
  return store.get('history')
}

export function addHistory(entry: HistoryEntry): void {
  const list = [entry, ...store.get('history')].slice(0, 50)
  store.set('history', list)
}

export function clearHistory(): void {
  store.set('history', [])
}
