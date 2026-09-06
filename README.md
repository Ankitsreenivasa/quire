# PDF Converter

An offline, iLovePDF-style desktop app (Electron + React + TypeScript). Convert, edit and
compress PDFs, images and video entirely on your machine — nothing is uploaded.

## Features (v1)

| Area | Tools |
|---|---|
| Convert | Image → PDF (JPG/PNG/HEIC/WEBP/AVIF/TIFF/BMP/GIF), PDF → JPG/PNG |
| Organize | Merge, Split (ranges / every N / extract), Rotate, Organize pages (reorder, rotate, delete) |
| Edit | Page numbers, Watermark (text or image) |
| Media | Compress PDF, Compress Image (batch, format convert, resize), Compress Video (H.264/H.265/VP9, CRF, resolution, trim, mute) |
| Image editor | Per-image crop, free-angle tilt, resize — applied before conversion/compression |

Light / dark / system theme, job history, configurable output folder and parallelism.

## Develop

```bash
npm install
npm run dev        # launch with hot reload
npm run typecheck
npm run build
npm run dist       # package (dmg / nsis / AppImage) via electron-builder
```

## Architecture

- `src/main` – Electron main process: a concurrency-limited job queue (`jobs/queue.ts`) that
  dispatches to per-tool runners in `jobs/pdf` and `jobs/media`. PDF work uses `pdf-lib` and
  `pdfjs-dist`; images use `sharp`; video uses bundled `ffmpeg`. A `media://` protocol streams
  local files to the renderer under CSP.
- `src/preload` – typed `window.api` bridge.
- `src/renderer` – React UI. `tools/registry.tsx` is the single source of truth for every
  tool's metadata and options form; `features/tools/ToolPage.tsx` is one generic workflow
  shell (drop → file list / page grid → options → progress → results) reused by all tools.
- `src/shared/types.ts` – IPC contracts shared by both sides.

### Optional: better PDF compression

Set a Ghostscript binary path in Settings to use it for `Compress PDF` (higher quality than
the built-in rasterize-and-rebuild fallback). Ghostscript is not bundled (AGPL).
