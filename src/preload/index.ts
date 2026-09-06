import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC,
  type AppSettings,
  type HistoryEntry,
  type InputFile,
  type JobProgress,
  type JobRequest,
  type JobResult,
  type JobResultFile,
  type RenderedPage,
  type ThemeMode
} from '../shared/types'

const api = {
  runJob: (req: JobRequest): Promise<JobResult> => ipcRenderer.invoke(IPC.runJob, req),
  cancelJob: (jobId: string): Promise<void> => ipcRenderer.invoke(IPC.cancelJob, jobId),
  onJobProgress: (cb: (p: JobProgress) => void): (() => void) => {
    const handler = (_e: unknown, p: JobProgress): void => cb(p)
    ipcRenderer.on(IPC.jobProgress, handler)
    return () => ipcRenderer.removeListener(IPC.jobProgress, handler)
  },
  probeFiles: (paths: string[]): Promise<InputFile[]> => ipcRenderer.invoke(IPC.probeFiles, paths),
  renderPdf: (filePath: string, width?: number): Promise<RenderedPage[]> =>
    ipcRenderer.invoke(IPC.renderPdf, filePath, width),
  pickFiles: (filters?: Electron.FileFilter[]): Promise<string[]> =>
    ipcRenderer.invoke(IPC.pickFiles, filters),
  pickDir: (): Promise<string | null> => ipcRenderer.invoke(IPC.pickDir),
  saveResults: (
    files: JobResultFile[],
    targetDir?: string
  ): Promise<{ saved: number; dir: string | null }> =>
    ipcRenderer.invoke(IPC.saveResults, files, targetDir),
  renameResult: (path: string, desired: string): Promise<JobResultFile> =>
    ipcRenderer.invoke(IPC.renameResult, path, desired),
  revealPath: (p: string): Promise<void> => ipcRenderer.invoke(IPC.revealPath, p),
  openPath: (p: string): Promise<string> => ipcRenderer.invoke(IPC.openPath, p),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.getSettings),
  setSettings: (patch: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.setSettings, patch),
  getHistory: (): Promise<HistoryEntry[]> => ipcRenderer.invoke(IPC.getHistory),
  clearHistory: (): Promise<HistoryEntry[]> => ipcRenderer.invoke(IPC.clearHistory),
  setNativeTheme: (mode: ThemeMode): Promise<void> => ipcRenderer.invoke(IPC.setNativeTheme, mode)
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
