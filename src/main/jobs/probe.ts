import { promises as fs } from 'fs'
import { extname, basename } from 'path'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import { ffmpegPath, ffprobePath } from '../binaries'
import { loadPdf } from './pdf/pdfjs'
import { createCanvas } from '@napi-rs/canvas'
import { NodeCanvasFactory } from './pdf/pdfjs'
import type { InputFile } from '../../shared/types'

ffmpeg.setFfmpegPath(ffmpegPath())
ffmpeg.setFfprobePath(ffprobePath())

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif', 'bmp', 'gif', 'heic', 'heif'])
const VIDEO_EXT = new Set(['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'wmv', 'flv'])

async function pdfThumb(data: Uint8Array): Promise<{ thumb: string; pages: number; width: number; height: number }> {
  const doc = await loadPdf(data)
  const page = await doc.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const scale = 220 / Math.max(viewport.width, viewport.height)
  const scaled = page.getViewport({ scale })
  const canvas = createCanvas(Math.ceil(scaled.width), Math.ceil(scaled.height))
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport: scaled,
    canvasFactory: new NodeCanvasFactory()
  }).promise
  const thumb = `data:image/jpeg;base64,${canvas.toBuffer('image/jpeg', 0.7).toString('base64')}`
  const result = { thumb, pages: doc.numPages, width: viewport.width, height: viewport.height }
  await doc.cleanup()
  return result
}

function videoMeta(path: string): Promise<{ width?: number; height?: number; duration?: number }> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(path, (err, data) => {
      if (err) return resolve({})
      const stream = data.streams?.find((s) => s.codec_type === 'video')
      resolve({
        width: stream?.width,
        height: stream?.height,
        duration: data.format?.duration
      })
    })
  })
}

export async function probeFiles(paths: string[]): Promise<InputFile[]> {
  const out: InputFile[] = []
  for (const path of paths) {
    const ext = extname(path).slice(1).toLowerCase()
    let stat
    try {
      stat = await fs.stat(path)
    } catch {
      continue
    }
    const file: InputFile = {
      id: randomUUID(),
      path,
      name: basename(path),
      ext,
      size: stat.size
    }

    try {
      if (ext === 'pdf') {
        const info = await pdfThumb(new Uint8Array(await fs.readFile(path)))
        file.thumb = info.thumb
        file.pages = info.pages
        file.width = info.width
        file.height = info.height
      } else if (IMAGE_EXT.has(ext)) {
        const img = sharp(path, { failOn: 'none' })
        const meta = await img.metadata()
        file.width = meta.width
        file.height = meta.height
        const buf = await img
          .rotate()
          .resize(220, 220, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 70 })
          .toBuffer()
        file.thumb = `data:image/jpeg;base64,${buf.toString('base64')}`
      } else if (VIDEO_EXT.has(ext)) {
        const meta = await videoMeta(path)
        file.width = meta.width
        file.height = meta.height
        file.duration = meta.duration
      }
    } catch {
      // metadata best-effort
    }

    out.push(file)
  }
  return out
}
