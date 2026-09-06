import { promises as fs } from 'fs'
import { PDFDocument } from 'pdf-lib'
import { writeResult, stem } from '../fsutil'
import { throwIfAborted, type JobRunner } from '../types'

export const mergePdf: JobRunner = async (req, ctx) => {
  const out = await PDFDocument.create()
  for (let i = 0; i < req.files.length; i++) {
    throwIfAborted(ctx.signal)
    const src = await PDFDocument.load(await fs.readFile(req.files[i].path))
    const pages = await out.copyPages(src, src.getPageIndices())
    pages.forEach((p) => out.addPage(p))
    ctx.onProgress((i + 1) / req.files.length)
  }
  const bytes = await out.save()
  const name = `${stem(req.files[0]?.path ?? 'merged')}-merged.pdf`
  return [await writeResult(ctx.outDir, name, bytes)]
}
