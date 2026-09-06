import { promises as fs } from 'fs'
import { join, parse } from 'path'
import type { JobResultFile } from '../../shared/types'

export async function ensureDir(dir: string): Promise<string> {
  await fs.mkdir(dir, { recursive: true })
  return dir
}

/** Returns a path in `dir` for `base`, adding " (2)", " (3)" ... on collision. */
export async function uniquePath(dir: string, base: string): Promise<string> {
  const { name, ext } = parse(base)
  let candidate = join(dir, base)
  let i = 2
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await fs.access(candidate)
      candidate = join(dir, `${name} (${i})${ext}`)
      i += 1
    } catch {
      return candidate
    }
  }
}

export async function writeResult(dir: string, base: string, data: Uint8Array | Buffer): Promise<JobResultFile> {
  await ensureDir(dir)
  const path = await uniquePath(dir, base)
  await fs.writeFile(path, data)
  const stat = await fs.stat(path)
  return { path, name: parse(path).base, size: stat.size }
}

export async function statResult(path: string): Promise<JobResultFile> {
  const stat = await fs.stat(path)
  return { path, name: parse(path).base, size: stat.size }
}

export function stem(p: string): string {
  return parse(p).name
}
