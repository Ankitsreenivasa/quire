import { ipcMain, dialog, shell, BrowserWindow, nativeTheme } from 'electron'
import { promises as fs } from 'fs'
import { join, basename } from 'path'
import { IPC, type JobRequest, type ThemeMode } from '../../shared/types'
import { jobQueue } from '../jobs/queue'
import { probeFiles } from '../jobs/probe'
import { uniquePath, ensureDir } from '../jobs/fsutil'
import { getSettings, setSettings, getHistory, clearHistory } from '../store'

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  jobQueue.on('progress', (p) => {
    getWindow()?.webContents.send(IPC.jobProgress, p)
  })

  ipcMain.handle(IPC.runJob, (_e, req: JobRequest) => jobQueue.submit(req))
  ipcMain.handle(IPC.cancelJob, (_e, jobId: string) => jobQueue.cancel(jobId))
  ipcMain.handle(IPC.probeFiles, (_e, paths: string[]) => probeFiles(paths))

  ipcMain.handle(IPC.pickFiles, async (_e, filters?: Electron.FileFilter[]) => {
    const win = getWindow()
    const res = await dialog.showOpenDialog(win!, {
      properties: ['openFile', 'multiSelections'],
      filters
    })
    return res.canceled ? [] : res.filePaths
  })

  ipcMain.handle(IPC.pickDir, async () => {
    const win = getWindow()
    const res = await dialog.showOpenDialog(win!, { properties: ['openDirectory', 'createDirectory'] })
    return res.canceled ? null : res.filePaths[0]
  })

  ipcMain.handle(IPC.saveResults, async (_e, files: { path: string }[], targetDir?: string) => {
    let dir = targetDir
    if (!dir) {
      const win = getWindow()
      const res = await dialog.showOpenDialog(win!, {
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: getSettings().outDir
      })
      if (res.canceled) return { saved: 0, dir: null }
      dir = res.filePaths[0]
    }
    await ensureDir(dir)
    let saved = 0
    for (const f of files) {
      const dest = await uniquePath(dir, basename(f.path))
      await fs.copyFile(f.path, dest)
      saved += 1
    }
    return { saved, dir }
  })

  ipcMain.handle(IPC.revealPath, (_e, p: string) => shell.showItemInFolder(p))
  ipcMain.handle(IPC.openPath, (_e, p: string) => shell.openPath(p))

  ipcMain.handle(IPC.getSettings, () => getSettings())
  ipcMain.handle(IPC.setSettings, (_e, patch) => setSettings(patch))
  ipcMain.handle(IPC.getHistory, () => getHistory())
  ipcMain.handle(IPC.clearHistory, () => {
    clearHistory()
    return []
  })

  ipcMain.handle(IPC.setNativeTheme, (_e, mode: ThemeMode) => {
    nativeTheme.themeSource = mode
  })
}

export { join }
