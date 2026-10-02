---
title: Installation
layout: default
nav_order: 2
description: "Installers for Windows, macOS and Linux, plus building from source"
---

# Installation
{: .fs-6 .fw-300 }

Prebuilt installers for every platform live on the
**[Releases page](https://github.com/FabianGallardo-coder/digibuddy/releases/latest)**.
{: .fs-5 .fw-300 }

## Prerequisites

Chat requires a running [Ollama](https://ollama.com) instance with at least one model:

```bash
ollama pull dolphin-phi     # default model used by digibuddy
```

Without Ollama the app still runs — the pet walks, watches the save, and answers
from built-in rules (see [Chat & Ollama]({{ site.baseurl }}/chat-and-ollama/)).

## Windows

1. Download `digibuddy_*_setup.exe` (NSIS installer) or `*.msi` from
   [Releases](https://github.com/FabianGallardo-coder/digibuddy/releases/latest).
2. Run it. SmartScreen will warn because the binary is unsigned —
   click **More information → Run anyway**.
3. Launch digibuddy from the Start menu.

## macOS

1. Download `digibuddy_*_universal.dmg` (Apple Silicon **and** Intel).
2. Open the dmg and drag the app to Applications.
3. Gatekeeper blocks unsigned apps on first launch — **right-click the app →
   Open → Open** (only needed once).

## Linux

| Format | Install |
|---|---|
| `.deb` (Debian/Ubuntu) | `sudo dpkg -i digibuddy_*_amd64.deb` |
| `.rpm` (Fedora/openSUSE) | `sudo rpm -i digibuddy-*.x86_64.rpm` |
| AppImage (any distro) | `chmod +x digibuddy_*.AppImage && ./digibuddy_*.AppImage` |

The AppImage bundles its own WebKit/GTK libraries — no system packages needed.

## Build from source

Requirements: Node.js 20+, Rust stable, and the
[Tauri 2 system dependencies](https://v2.tauri.app/start/prerequisites/)
(`libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`,
`librsvg2-dev` on Debian/Ubuntu).

```bash
git clone https://github.com/FabianGallardo-coder/digibuddy.git
cd digibuddy
npm install
npm run tauri dev      # development build with hot reload
npm run tauri build    # production installers → src-tauri/target/release/bundle/
```

Python 3 is only needed if you regenerate the game sprites — see
[Development]({{ site.baseurl }}/development/).

## Verify what you installed

- The tray/icon menu (right-click) and the walking sprite appear immediately.
- Point Ollama at your model: **right-click → chat → "switch model"** or set it
  in the console — see [User guide]({{ site.baseurl }}/user-guide/).
- digibuddy only needs read access to your tuipet save —
  see [Save watcher]({{ site.baseurl }}/save-watch/).

Next: [User guide]({{ site.baseurl }}/user-guide/){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 }
