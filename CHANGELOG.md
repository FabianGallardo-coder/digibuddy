# Changelog

All notable changes to digibuddy are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/), versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- English documentation site (`docs/`) published on GitHub Pages, mirrored to
  the repository wiki via `tools/sync-wiki.ps1`

### Changed

- Documentation site rebuilt on a custom design system instead of the
  `just-the-docs` theme: new landing page (hero, feature grid,
  auto-generated doc cards), dark mode with persistent toggle, copy buttons
  on code blocks and a mobile chip navigation

### Fixed

- Wiki sync copied Liquid syntax literally (raw `{% for %}` lines and
  `{{ p.* }}` placeholders): `tools/sync-wiki.ps1` now strips Liquid tags,
  maps the doc-cards grid to a static link list and titles the wiki Home
  page `Home` instead of `index`

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
