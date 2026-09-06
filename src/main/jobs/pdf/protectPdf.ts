import { loadPdfDoc } from './load'
import { writeResult, stem } from '../fsutil'
import { throwIfAborted, type JobRunner } from '../types'

interface Options {
  password?: string
  confirm?: string
  allowPrinting?: boolean
  allowCopying?: boolean
}

export const protectPdf: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  const pw = (opts.password ?? '').trim()
  if (!pw) throw new Error('Enter a password to protect the PDF.')
  if (opts.confirm !== undefined && opts.confirm !== opts.password) {
    throw new Error('The two passwords do not match.')
  }

  const results = []
  for (let i = 0; i < req.files.length; i++) {
    throwIfAborted(ctx.signal)
    const f = req.files[i]
    const doc = await loadPdfDoc(f.path)
    doc.encrypt({
      userPassword: pw,
      ownerPassword: pw,
      permissions: {
        printing: opts.allowPrinting === false ? undefined : 'highResolution',
        copying: opts.allowCopying !== false,
        modifying: false
      }
    })
    const bytes = await doc.save()
    results.push(await writeResult(ctx.outDir, `${stem(f.path)}-protected.pdf`, bytes))
    ctx.onProgress((i + 1) / req.files.length)
  }

  return results
}
