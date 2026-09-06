# Building & releasing

## Why CI builds each OS separately

Three dependencies ship a **per-platform prebuilt binary** and npm only installs the one
matching the current machine:

- `sharp` → `@img/sharp-<platform>` + libvips
- `@napi-rs/canvas` → `@napi-rs/canvas-<platform>` (`skia.<platform>.node`)
- `ffmpeg-static` → a single `ffmpeg` binary downloaded at install time

So a Windows or Linux build produced on a Mac would be missing those binaries and crash on
first use. `.github/workflows/release.yml` runs `npm ci` + `electron-builder` on
`macos-14`, `windows-latest` and `ubuntu-latest`, so each installer gets the right binaries.
`npmRebuild: false` in `electron-builder.yml` keeps electron-builder from trying to compile
them.

## Cutting a release

```bash
npm version patch          # bumps package.json, creates a git tag vX.Y.Z
git push --follow-tags
```

The tag triggers the workflow: it builds all three OSes, then opens a **draft** GitHub
Release with the installers attached. Review it and publish.

You can also run the workflow manually (`Actions → Build & Release → Run workflow`) to get
artifacts without tagging — no Release is created in that case.

Outputs:

| OS | Files |
|---|---|
| macOS | `*-arm64.dmg`, `*-x64.dmg`, `*-arm64-mac.zip`, `*-x64-mac.zip` |
| Windows | `PDF Converter Setup *.exe` (NSIS, x64) |
| Linux | `*.AppImage`, `*.deb` |

## Local single-OS build

```bash
npm run build
npm run dist          # current OS
npm run dist:mac      # or :win / :linux (only reliable on that OS)
```

## Icons

`npm run icons` regenerates `build/icon.png` (1024²), `build/icon.icns` and `build/icon.ico`
from the persimmon "P" monogram drawn in `scripts/make-icons.mjs`. The generated files are
committed so CI doesn't need to run the script.

## Code signing

Not configured. macOS notarization needs a paid Apple Developer account; when one is
available, add `mac.identity`, an `entitlements` file and the `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD`
/ `APPLE_TEAM_ID` secrets, then set `mac.notarize: true`.

## Opening an unsigned build

- **macOS**: right-click the app → **Open** → **Open** (once). Or, if it was quarantined:
  `xattr -dr com.apple.quarantine "/Applications/PDF Converter.app"`.
- **Windows**: SmartScreen → **More info** → **Run anyway**.
- **Linux**: `chmod +x "PDF Converter-*.AppImage"` then run it. For the `.deb`:
  `sudo apt install ./PDF*.deb`.
