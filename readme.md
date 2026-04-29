# רמב"ם יומי — Daily Rambam

macOS menu-bar app that prompts you to read your daily Rambam chapters (1 or 3/day) using randomised smart scheduling.

---

## ⬇️ Download

**[→ Latest Release (GitHub Releases)](https://github.com/Mocoloco461/daily-rambam/releases/latest)**

Download the `.dmg`, open it, drag the app to `/Applications`, and launch.

> All releases: [releases/README.md](releases/README.md)

---

## Requirements

- macOS 12+
- Node.js 20+
- npm 9+

---

## Quick Start (Dev)

```bash
git clone git@github.com:Mocoloco461/daily-rambam.git
cd daily-rambam
npm install
npm start
```

```bash
npm run dev        # electron with --dev flag
```

---

## Build DMG Locally

```bash
npm run build:prod    # clean build → dist/
npm run release       # build + copy DMG to releases/
```

---

## Branch & Pipeline Flow

```
test ──[CI]──► stage ──[CI + DMG build + smoke tests]──► main ──[tag v*]──► GitHub Release
```

| Branch | Purpose | Auto-promote |
|--------|---------|-------------|
| `test` | Active development, free to experiment | → `stage` on CI pass |
| `stage` | Integration + DMG build + smoke tests | → `main` on all-pass |
| `main` | Production — stable only | CD on `v*` tag |

> **Note:** Auto-promotion between branches requires a `GH_PAT` secret (classic PAT, `repo` scope) in repository Settings → Secrets. Without it, promotion is triggered but won't chain into the next workflow automatically.

---

## Releasing a New Version

```bash
# 1. Bump version in package.json + CHANGELOG.md
# 2. Commit and push to test → flows through to main automatically
# 3. Tag from main:
git tag v1.2.0 -m "release: v1.2.0"
git push origin v1.2.0
# → GitHub Actions builds DMG and publishes GitHub Release
```

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