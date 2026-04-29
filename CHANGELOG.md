# CHANGELOG

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.1.0] - 2026-04-29

### Added
- CI workflow: Node syntax validation on push/PR to `main` and `stage`
- CD workflow: DMG build and GitHub Release on version tags (`v*`)
- AI agent rules in `.ai-rules/` (project structure, purpose, versioning)
- `release/` directory convention for local DMG artifacts
- Technical README with quick-start, environments, and release instructions

### Changed
- Improved `.gitignore`: added `release/`, `electron-builder-cache/`, `image.png`
- `package.json`: bumped to `1.1.0`, added `build:stage` and `build:prod` scripts

---

## [1.0.0] - 2026-04-28

### Added
- Initial release: menu-bar app with Tray, Dashboard, and overlay
- Smart interval scheduler with ±30% jitter
- 1-chapter and 3-chapter daily modes via TorahCalc + Sefaria APIs
- History tracking with electron-store
- Reset daily progress with double-confirmation
- macOS multi-display support (dim secondary screens)
- Custom `.icns` icon
