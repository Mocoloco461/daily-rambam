# Versioning — Rambam Daily

> Rule file for AI agents. Read this before bumping versions or cutting releases.

## Versioning Scheme

This project follows [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

| Part | Bump when |
|------|-----------|
| `MAJOR` | Breaking change in behavior, data schema incompatibility, or complete UX overhaul |
| `MINOR` | New user-facing feature (new study mode, new UI panel, new API integration) |
| `PATCH` | Bug fix, copy change, scheduler tweak, dependency update, CI/CD change |

## When to Update the Version

### Bump PATCH (`x.y.Z`)
- Fixing a scheduler bug or interval calculation
- Fixing text rendering / encoding issues
- Fixing a UI layout problem
- Updating dependencies (minor/patch semver)
- CI/CD or tooling changes with no user-facing impact

### Bump MINOR (`x.Y.0`)
- Adding a new study mode
- Adding a new dashboard section (e.g., statistics page)
- Adding new API integrations
- Adding user preferences that didn't exist before

### Bump MAJOR (`X.0.0`)
- Breaking changes to `electron-store` data schema requiring migration
- Complete rewrite of the scheduling engine
- Dropping support for macOS versions
- Switching from Electron to another framework

## Release Process

1. **Update `package.json`** — bump `"version"` field.
2. **Update `CHANGELOG.md`** — add a new `## [X.Y.Z] - YYYY-MM-DD` section.
3. **Commit** using Conventional Commits:
   ```
   chore: bump version to X.Y.Z
   ```
4. **Tag** the commit:
   ```bash
   git tag vX.Y.Z -m "release: vX.Y.Z"
   ```
5. **Push** the tag to trigger the CD pipeline:
   ```bash
   git push origin vX.Y.Z
   ```
   The CD workflow (`.github/workflows/cd.yml`) will:
   - Build the DMG on `macos-latest`
   - Create a GitHub Release with the DMG attached

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use for |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `chore:` | Tooling, config, deps (no production code change) |
| `docs:` | Documentation only |
| `ci:` | CI/CD workflow changes |
| `refactor:` | Code restructure, no behavior change |
| `style:` | Formatting, whitespace |

## Current Version History

| Version | Date | Summary |
|---------|------|---------|
| `v1.1.0` | 2026-04-29 | CI/CD, versioning, AI rules, improved gitignore |
| `v1.0.0` | 2026-04-28 | Initial release |
