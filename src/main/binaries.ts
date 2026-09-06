import { app } from 'electron'

/**
 * ffmpeg-static resolves to a path inside node_modules. In a packaged app that
 * path lives inside app.asar (unreadable by a child process) and must be
 * redirected to the unpacked copy.
 */
export function ffmpegPath(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let p: string = require('ffmpeg-static') as string
  if (app.isPackaged) {
    p = p.replace('app.asar', 'app.asar.unpacked')
  }
  return p
}

export function ffprobePath(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let p: string = (require('ffprobe-static') as { path: string }).path
  if (app.isPackaged) {
    p = p.replace('app.asar', 'app.asar.unpacked')
  }
  return p
}
