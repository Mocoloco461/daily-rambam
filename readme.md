# רמב"ם יומי — Daily Rambam

macOS menu-bar app that prompts you to read your daily Rambam chapters (1 or 3/day) using randomised smart scheduling.

---

## Requirements

- macOS 12+
- Node.js 20+
- npm 9+

---

## Quick Start

```bash
git clone git@github.com:Mocoloco461/daily-rambam.git
cd daily-rambam
npm install
npm start
```

## Development

```bash
npm run dev        # electron with --dev flag
```

## Build DMG

```bash
npm run build      # outputs to dist/
```

Clean build:
```bash
rm -rf dist && npm run build
```

---

## Environments

| Branch | Purpose |
|--------|---------|
| `main` | Production — triggers versioned releases on `v*` tags |
| `stage` | Staging — CI only, no release |

CD produces a signed-less DMG on `macos-latest` (adequate for personal use).

---

## Releasing

```bash
git tag v1.2.0 -m "release: v1.2.0"
git push origin v1.2.0
```

GitHub Actions will build the DMG and publish it as a GitHub Release.

---

## Tech Stack

- **Electron** 41 — main process + IPC
- **electron-store** — persistent settings & history
- **electron-builder** — DMG packaging
- **TorahCalc API** — daily learning schedule
- **Sefaria API** — Hebrew chapter text

---

## Version

Current: `v1.1.0` — see [CHANGELOG](CHANGELOG.md) and [Releases](https://github.com/Mocoloco461/daily-rambam/releases).