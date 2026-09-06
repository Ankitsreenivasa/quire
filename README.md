# PDF Converter

An offline, iLovePDF-style desktop app (Electron + React + TypeScript). Convert, edit and
compress PDFs, images and video entirely on your machine — nothing is uploaded.

## Download

Grab the installer for your OS from the [Releases](../../releases) page:

| OS | File |
|---|---|
| macOS (Apple Silicon / Intel) | `PDF Converter-<version>-arm64.dmg` / `-x64.dmg` |
| Windows 10/11 (x64) | `PDF Converter Setup <version>.exe` |
| Linux | `PDF Converter-<version>.AppImage` or `.deb` |

Builds are **not code-signed** yet, so the OS will warn on first launch — see
[BUILD.md](BUILD.md#opening-an-unsigned-build) for the one-time steps to open them.

## Features

| Area | Tools |
|---|---|
| Convert | Image → PDF (JPG/PNG/HEIC/WEBP/AVIF/TIFF/BMP/GIF), PDF → JPG/PNG |
| Organize | Merge, Split (ranges / every N / extract), Rotate, Organize pages (reorder, rotate, delete) |
| Edit | Crop, Sign (draw / type / upload), Edit (text, shapes, highlight, freehand, images), Page numbers, Watermark |
| Optimize | Compress PDF, Protect (password) & Unlock PDF |
| Media | Compress Image (batch, format convert, resize), Compress Video (H.264/H.265/VP9, CRF, resolution, trim, mute) |
| Image editor | Per-image crop, free-angle tilt, resize — applied before conversion/compression |

Light / dark / system theme, job history, configurable output folder and parallelism.

## Develop

```bash
npm install
npm run dev        # launch with hot reload
npm run typecheck
npm run build
npm run icons      # regenerate build/icon.{png,icns,ico} from the monogram
npm run dist       # package for the current OS via electron-builder
```

Cross-platform installers are produced by CI (`.github/workflows/release.yml`) — one runner
per OS, because the native modules (`sharp`, `@napi-rs/canvas`, `ffmpeg-static`) install
per-platform. See [BUILD.md](BUILD.md).

## Architecture

- `src/main` – Electron main process: a concurrency-limited job queue (`jobs/queue.ts`) that
  dispatches to per-tool runners in `jobs/pdf` and `jobs/media`. PDF work uses `pdf-lib` and
  `pdfjs-dist`; images use `sharp`; video uses bundled `ffmpeg`. A `media://` protocol streams
  local files to the renderer under CSP. PDF work uses `@cantoo/pdf-lib` (a `pdf-lib` fork with
  password encryption) so Protect/Unlock work without any native dependency.
- `src/preload` – typed `window.api` bridge.
- `src/renderer` – React UI. `tools/registry.tsx` is the single source of truth for every
  tool's metadata and options form; `features/tools/ToolPage.tsx` is one generic workflow
  shell (drop → file list / page grid → options → progress → results) reused by all tools.
- `src/shared/types.ts` – IPC contracts shared by both sides.

### Optional: better PDF compression

Set a Ghostscript binary path in Settings to use it for `Compress PDF` (higher quality than
the built-in rasterize-and-rebuild fallback). Ghostscript is not bundled (AGPL).
