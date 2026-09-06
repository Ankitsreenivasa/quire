import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/features/home/HomePage'
import { ToolPage } from '@/features/tools/ToolPage'
import { HistoryPage } from '@/features/history/HistoryPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { useAppStore } from '@/store/useAppStore'

export function App(): JSX.Element {
  const init = useAppStore((s) => s.init)
  const ready = useAppStore((s) => s.settings !== null)

  useEffect(() => {
    void init()
  }, [init])

  if (!ready) return <div className="grid h-full place-items-center text-sm text-muted">Loading…</div>

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tool/:toolId" element={<ToolPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
