import sharp, { type Sharp } from 'sharp'
import type { ImageTransform } from '../../../shared/types'

/**
 * Apply an ordered list of transforms (crop -> rotate -> resize) to an image
 * buffer and return a sharp pipeline ready for `.toFormat()`.
 */
export async function applyTransforms(
  input: Buffer | string,
  transforms: ImageTransform[] = []
): Promise<Sharp> {
  let pipeline = sharp(input, { failOn: 'none', animated: false }).rotate() // auto-orient from EXIF

  for (const t of transforms) {
    if (t.crop) {
      const meta = await pipeline.clone().metadata()
      const maxW = meta.width ?? t.crop.x + t.crop.width
      const maxH = meta.height ?? t.crop.y + t.crop.height
      const left = Math.max(0, Math.round(t.crop.x))
      const top = Math.max(0, Math.round(t.crop.y))
      const width = Math.max(1, Math.min(Math.round(t.crop.width), maxW - left))
      const height = Math.max(1, Math.min(Math.round(t.crop.height), maxH - top))
      pipeline = sharp(await pipeline.extract({ left, top, width, height }).toBuffer(), { failOn: 'none' })
    }

    if (t.rotate && t.rotate % 360 !== 0) {
      const rotated = sharp(
        await pipeline
          .rotate(t.rotate, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .toBuffer()
      )
      if (t.rotateFit === 'crop') {
        const meta = await pipeline.clone().metadata()
        const rMeta = await rotated.clone().metadata()
        const w = meta.width ?? 0
        const h = meta.height ?? 0
        const rw = rMeta.width ?? w
        const rh = rMeta.height ?? h
        pipeline = sharp(
          await rotated
            .extract({
              left: Math.max(0, Math.round((rw - w) / 2)),
              top: Math.max(0, Math.round((rh - h) / 2)),
              width: Math.min(rw, Math.max(1, w)),
              height: Math.min(rh, Math.max(1, h))
            })
            .toBuffer()
        )
      } else {
        pipeline = rotated
      }
    }

    if (t.resize) {
      const meta = await pipeline.clone().metadata()
      const srcW = meta.width ?? 0
      const srcH = meta.height ?? 0
      let width: number | undefined
      let height: number | undefined
      if (t.resize.mode === 'percent' && t.resize.percent) {
        width = Math.max(1, Math.round((srcW * t.resize.percent) / 100))
        height = Math.max(1, Math.round((srcH * t.resize.percent) / 100))
      } else {
        width = t.resize.width
        height = t.resize.height
        if (t.resize.lockAspect !== false) {
          if (width && !height) height = undefined
          if (height && !width) width = undefined
        }
      }
      pipeline = sharp(
        await pipeline
          .resize({ width, height, fit: t.resize.lockAspect === false ? 'fill' : 'inside', withoutEnlargement: false })
          .toBuffer()
      )
    }
  }

  return pipeline
}
