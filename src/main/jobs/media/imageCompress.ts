import { applyTransforms } from './imageTransform'
import { writeResult, stem } from '../fsutil'
import { throwIfAborted, type JobRunner } from '../types'

interface Options {
  format?: 'keep' | 'jpg' | 'png' | 'webp' | 'avif'
  quality?: number
  maxDimension?: number
  stripMetadata?: boolean
}

const EXT: Record<string, string> = { jpg: 'jpg', png: 'png', webp: 'webp', avif: 'avif' }

export const imageCompress: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  const quality = opts.quality ?? 70
  const results = []

  for (let i = 0; i < req.files.length; i++) {
    throwIfAborted(ctx.signal)
    const f = req.files[i]
    let pipeline = await applyTransforms(f.path, f.transforms)
    const meta = await pipeline.clone().metadata()

    if (opts.maxDimension && (meta.width || meta.height)) {
      const longest = Math.max(meta.width ?? 0, meta.height ?? 0)
      if (longest > opts.maxDimension) {
        pipeline = pipeline.resize({
          width: (meta.width ?? 0) >= (meta.height ?? 0) ? opts.maxDimension : undefined,
          height: (meta.height ?? 0) > (meta.width ?? 0) ? opts.maxDimension : undefined,
          fit: 'inside'
        })
      }
    }

    if (opts.stripMetadata === false) pipeline = pipeline.withMetadata()

    let target = opts.format ?? 'keep'
    if (target === 'keep') {
      const fmt = (meta.format ?? 'jpeg').toLowerCase()
      target = fmt === 'png' ? 'png' : fmt === 'webp' ? 'webp' : fmt === 'avif' ? 'avif' : 'jpg'
    }

    let buf: Buffer
    if (target === 'png') buf = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer()
    else if (target === 'webp') buf = await pipeline.webp({ quality }).toBuffer()
    else if (target === 'avif') buf = await pipeline.avif({ quality }).toBuffer()
    else buf = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer()

    results.push(await writeResult(ctx.outDir, `${stem(f.path)}-min.${EXT[target] ?? 'jpg'}`, buf))
    ctx.onProgress((i + 1) / req.files.length)
  }

  return results
}
