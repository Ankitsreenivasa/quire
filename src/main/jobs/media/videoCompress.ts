import ffmpeg from 'fluent-ffmpeg'
import { ffmpegPath } from '../../binaries'
import { uniquePath, statResult, stem } from '../fsutil'
import { ensureDir } from '../fsutil'
import { throwIfAborted, type JobRunner } from '../types'

ffmpeg.setFfmpegPath(ffmpegPath())

interface Options {
  codec?: 'h264' | 'h265' | 'vp9'
  crf?: number
  resolution?: 'keep' | '2160' | '1440' | '1080' | '720' | '480'
  fps?: number
  mute?: boolean
  trimStart?: number // seconds
  trimEnd?: number // seconds
}

const CODEC: Record<string, { lib: string; ext: string }> = {
  h264: { lib: 'libx264', ext: 'mp4' },
  h265: { lib: 'libx265', ext: 'mp4' },
  vp9: { lib: 'libvpx-vp9', ext: 'webm' }
}

export const videoCompress: JobRunner = async (req, ctx) => {
  const opts = (req.options ?? {}) as Options
  const codec = CODEC[opts.codec ?? 'h264']
  const crf = opts.crf ?? 28
  const results = []
  await ensureDir(ctx.outDir)

  for (let i = 0; i < req.files.length; i++) {
    throwIfAborted(ctx.signal)
    const f = req.files[i]
    const outPath = await uniquePath(ctx.outDir, `${stem(f.path)}-compressed.${codec.ext}`)

    await new Promise<void>((resolve, reject) => {
      let cmd = ffmpeg(f.path).videoCodec(codec.lib).outputOptions([`-crf ${crf}`, '-preset medium'])

      if (opts.resolution && opts.resolution !== 'keep') {
        cmd = cmd.size(`?x${opts.resolution}`)
      }
      if (opts.fps) cmd = cmd.fps(opts.fps)
      if (opts.mute) cmd = cmd.noAudio()
      else cmd = cmd.audioCodec(opts.codec === 'vp9' ? 'libopus' : 'aac').audioBitrate('128k')
      if (opts.trimStart) cmd = cmd.setStartTime(opts.trimStart)
      if (opts.trimEnd && opts.trimEnd > (opts.trimStart ?? 0)) {
        cmd = cmd.setDuration(opts.trimEnd - (opts.trimStart ?? 0))
      }

      const onAbort = () => {
        cmd.kill('SIGKILL')
        reject(Object.assign(new Error('canceled'), { name: 'AbortError' }))
      }
      ctx.signal.addEventListener('abort', onAbort, { once: true })

      cmd
        .on('progress', (p) => {
          const frac = Math.min(0.99, (p.percent ?? 0) / 100)
          ctx.onProgress((i + frac) / req.files.length, `${Math.round((p.percent ?? 0))}%`)
        })
        .on('end', () => {
          ctx.signal.removeEventListener('abort', onAbort)
          resolve()
        })
        .on('error', (err) => {
          ctx.signal.removeEventListener('abort', onAbort)
          reject(err)
        })
        .save(outPath)
    })

    results.push(await statResult(outPath))
    ctx.onProgress((i + 1) / req.files.length)
  }

  return results
}
