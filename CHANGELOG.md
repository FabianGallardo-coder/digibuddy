# Changelog

All notable changes to digibuddy are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/), versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- English documentation site (`docs/`) published on GitHub Pages, mirrored to
  the repository wiki via `tools/sync-wiki.ps1`

## [0.1.0] - 2026-10-02

### Added

- First public release with installers for Windows (NSIS + MSI), Linux
  (deb + rpm + AppImage) and macOS (universal dmg, arm64 + x86_64)
- GitHub Actions: `ci.yml` (frontend build + `cargo check` on Ubuntu/Windows)
  and `release.yml` (tag `v*` → draft release with all assets)
- README download section, releases badge and platform notes
- Package metadata (license, repository, authors) across Cargo and npm

### Fixed

- Walker froze after a single step: the pet now resumes walking after every
  step (tick loop in `src/walk.ts`)

[Unreleased]: https://github.com/FabianGallardo-coder/digibuddy/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/FabianGallardo-coder/digibuddy/releases/tag/v0.1.0
