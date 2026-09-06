// Generates build/icon.png (1024²), build/icon.icns and build/icon.ico
// from a persimmon "P" monogram — the "Atelier" identity mark.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas } from '@napi-rs/canvas'
import iconGen from 'icon-gen'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = join(root, 'build')
mkdirSync(buildDir, { recursive: true })

const S = 1024
const canvas = createCanvas(S, S)
const ctx = canvas.getContext('2d')

// warm paper ground with a soft rounded square
ctx.fillStyle = '#F4F1EA'
ctx.fillRect(0, 0, S, S)

const pad = 96
const r = 160
ctx.fillStyle = '#C4562E'
ctx.beginPath()
ctx.roundRect(pad, pad, S - pad * 2, S - pad * 2, r)
ctx.fill()

// serif "P"
ctx.fillStyle = '#FFFFFF'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.font = '620px Georgia, "Times New Roman", serif'
ctx.fillText('P', S / 2, S / 2 + 30)

const pngPath = join(buildDir, 'icon.png')
writeFileSync(pngPath, canvas.toBuffer('image/png'))
console.log('wrote', pngPath)

await iconGen(pngPath, buildDir, {
  report: false,
  icns: { name: 'icon', sizes: [16, 32, 64, 128, 256, 512, 1024] },
  ico: { name: 'icon', sizes: [16, 24, 32, 48, 64, 128, 256] },
  favicon: false
})

// icon-gen may drop a stray favicon set; keep only what electron-builder needs
for (const stray of ['favicon.ico', 'favicon-16.png', 'favicon-32.png']) {
  try {
    rmSync(join(buildDir, stray))
  } catch {
    /* not present */
  }
}
console.log('wrote build/icon.icns and build/icon.ico')
