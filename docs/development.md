---
title: Development
layout: default
nav_order: 7
description: "Setup, project layout, CI and the release process"
---

# Development
{: .fs-6 .fw-300 }

Contributions and local hacking are welcome.
{: .fs-5 .fw-300 }

## Prerequisites

- Node.js 20+ (npm)
- Rust stable (`rustup default stable`)
- [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS
- Python 3 (only for `tools/export_*.py`)
- Ollama running with `dolphin-phi` (for chat testing)

## Run it

```bash
git clone https://github.com/FabianGallardo-coder/digibuddy.git
cd digibuddy
npm install
npm run tauri dev        # hot-reload dev app
npm run build            # typecheck + frontend bundle only
cargo check              # in src-tauri/: fast Rust typecheck
```

## Project layout

```text
digibuddy/
├── docs/                  ← this documentation (GitHub Pages)
├── media/                 demo.gif, social-preview.png
├── public/                sprites.json, digidex.json, sounds/
├── src/                   TypeScript frontend (see Architecture)
├── src-tauri/
│   ├── src/main.rs        entry point
│   ├── src/lib.rs         Ollama client, save watcher, menu
│   ├── tauri.conf.json    bundle config, identifier, icons
│   └── Cargo.toml
├── tools/
│   ├── export_sprites.py  → public/sprites.json (from tuipet)
│   └── export_digidex.py  → public/digidex.json (knowledge)
└── .github/workflows/
    ├── ci.yml             build + cargo check on push/PR
    └── release.yml        tag v* → draft release with installers
```

## CI

`ci.yml` runs on every push to `Master` and on pull requests:

1. **frontend**: `npm ci && npm run build` (Ubuntu)
2. **rust**: `cargo check` on Ubuntu **and** Windows (with WebKit/GTK deps)

## Releases

Handled by `release.yml` — no manual bundling:

1. Bump `version` in `package.json`, `src-tauri/tauri.conf.json` and
   `src-tauri/Cargo.toml` (keep them equal)
2. Update the `releaseBody` in `.github/workflows/release.yml`
3. Commit, then:

```bash
git tag v0.2.0
git push origin v0.2.0
```

4. The workflow builds on **Windows** (NSIS + MSI), **Ubuntu** (deb + rpm +
   AppImage) and **macOS** (universal dmg, arm64 + x86_64, ad-hoc signed) and
   creates a **draft release** with all assets (~10–12 min)
5. Smoke-test the Windows installer, then publish:
   `gh release edit vX.Y.Z --draft=false`

## Conventions

- Branch: `type/short-description` (`fix/walker-resume`, `docs/wiki-pages`)
- Commits: [Conventional Commits](https://www.conventionalcommits.org/)
  (`fix(walker): …`, `feat(chat): …`, `docs: …`)
- No direct pushes to `Master` — open a PR, let CI pass
- Scope every change to one logical unit

## Docs workflow

Documentation lives in `docs/` and is published by GitHub Pages. After editing:

1. Open a PR with the change
2. Once merged, the site rebuilds automatically (~1 min)
3. Mirror to the wiki when needed:

```powershell
pwsh tools/sync-wiki.ps1
```

Next: [FAQ]({{ site.baseurl }}/faq/){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 }
