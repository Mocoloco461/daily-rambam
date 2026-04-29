# Project Structure — Rambam Daily

> Rule file for AI agents. Read this before making any changes to the codebase.

## Repository Layout

```
daily-rambam/
├── main.js                  # Electron main process — all IPC handlers, scheduler, windows
├── preload.js               # Context bridge: exposes safe APIs to renderer
├── package.json             # App metadata, scripts, electron-builder config
├── CHANGELOG.md             # All version history (Keep a Changelog format)
│
├── src/
│   ├── dashboard/
│   │   ├── index.html       # Settings + history UI
│   │   ├── dashboard.js     # Renderer logic for dashboard
│   │   └── style.css        # Dashboard styles
│   └── overlay/
│       ├── index.html       # Full-screen chapter display
│       ├── overlay.js       # Renderer logic for overlay
│       └── style.css        # Overlay styles
│
├── assets/
│   ├── icon.icns            # macOS app icon (built from icon.png)
│   ├── icon.png             # App icon PNG source
│   └── trayTemplate.png     # Menu bar tray icon (template image, 22×22 @2x)
│
├── .github/
│   └── workflows/
│       ├── ci.yml           # CI: syntax validation on push/PR to main & stage
│       └── cd.yml           # CD: DMG build + GitHub Release on v* tags
│
├── .ai-rules/               # AI agent context files (this directory)
│   ├── project-structure.md
│   ├── project-purpose.md
│   └── versioning.md
│
├── dist/                    # electron-builder output — GITIGNORED
├── release/                 # Local DMG copies — GITIGNORED
└── node_modules/            # GITIGNORED
```

## Key Architectural Rules

### IPC Pattern
- **All** business logic lives in `main.js` (main process).
- Renderers communicate **only** through `window.electronAPI.*` (defined in `preload.js`).
- Never use `nodeIntegration: true`. Always use `contextIsolation: true`.

### State Storage
- Persistent state is managed by `electron-store` in `main.js`.
- Store schema: `settings`, `history`, `todayProgress`.
- Never read/write the store from renderers directly.

### Windows
- `dashboardWindow` — settings & history (420×720, hidden inset title bar)
- `overlayWindow` — full-screen study prompt (frameless, transparent, always-on-top)
- `dimWindows[]` — one per non-active display (mouse-event passthrough)

### Asset Conventions
- Tray icon: must be a **Template image** (black + alpha only, macOS auto-inverts for dark mode).
- App icon: `assets/icon.icns` (required for DMG build). Source is `assets/icon.png`.
- Do NOT commit `image.png` (raw source) — it is `.gitignore`d.

### Branches
- `main` — production-ready code only
- `stage` — integration testing before merge to main
