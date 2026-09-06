import { PDFDocument } from '@cantoo/pdf-lib'
import { applyTransforms } from '../media/imageTransform'
import { writeResult, stem } from '../fsutil'
import { throwIfAborted, type JobRunner } from '../types'

interface Options {
  pageSize?: 'fit' | 'a4' | 'letter'
  orientation?: 'auto' | 'portrait' | 'landscape'
  margin?: number
  mode?: 'single' | 'per-file'
}

const PAGE: Record<'a4' | 'letter', [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792]
}

async function addImagePage(pdf: PDFDocument, bytes: Uint8Array, isPng: boolean, opts: Options): Promise<void> {
  const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
  const margin = opts.margin ?? 0
  const size = opts.pageSize ?? 'fit'

  if (size === 'fit') {
    const page = pdf.addPage([img.width + margin * 2, img.height + margin * 2])
    page.drawImage(img, { x: margin, y: margin, width: img.width, height: img.height })
    return
  }

  let [pw, ph] = PAGE[size]
  const wantLandscape =
    opts.orientation === 'landscape' ||
    (opts.orientation === 'auto' && img.width > img.height)
  if (wantLandscape) [pw, ph] = [ph, pw]

  const page = pdf.addPage([pw, ph])
  const availW = pw - margin * 2
  const availH = ph - margin * 2
  const scale = Math.min(availW / img.width, availH / img.height)
  const w = img.width * scale
  const h = img.height * scale
  page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h })
}

export const imagesToPdf: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  const mode = opts.mode ?? 'single'
  const results = []

  if (mode === 'single') {
    const pdf = await PDFDocument.create()
    for (let i = 0; i < req.files.length; i++) {
      throwIfAborted(ctx.signal)
      const f = req.files[i]
      const pipeline = await applyTransforms(f.path, f.transforms)
      const hasAlpha = (await pipeline.clone().metadata()).hasAlpha
      const bytes = hasAlpha
        ? await pipeline.png().toBuffer()
        : await pipeline.jpeg({ quality: 92 }).toBuffer()
      await addImagePage(pdf, bytes, !!hasAlpha, opts)
      ctx.onProgress((i + 1) / req.files.length)
    }
    const out = await pdf.save()
    results.push(await writeResult(ctx.outDir, `${stem(req.files[0].path) || 'images'}.pdf`, out))
  } else {
    for (let i = 0; i < req.files.length; i++) {
      throwIfAborted(ctx.signal)
      const f = req.files[i]
      const pdf = await PDFDocument.create()
      const pipeline = await applyTransforms(f.path, f.transforms)
      const hasAlpha = (await pipeline.clone().metadata()).hasAlpha
      const bytes = hasAlpha
        ? await pipeline.png().toBuffer()
        : await pipeline.jpeg({ quality: 92 }).toBuffer()
      await addImagePage(pdf, bytes, !!hasAlpha, opts)
      const out = await pdf.save()
      results.push(await writeResult(ctx.outDir, `${stem(f.path)}.pdf`, out))
      ctx.onProgress((i + 1) / req.files.length)
    }
  }

  return results
}
