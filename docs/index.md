---
title: Home
layout: default
nav_order: 1
description: "Desktop Digimon pet for tuipet that walks your screen and chats with your local LLM"
---

# digibuddy
{: .fs-6 .fw-300 }

A desktop pet for [tuipet](https://github.com/joeltco/tuipet): a Digimon that wanders your screen, chats with a **local LLM**, and reacts to your game — **without ever touching your save**.
{: .fs-5 .fw-300 .text-grey-dk-000 }

![digibuddy: walks, opens the chat with one click, answers from a local LLM](https://raw.githubusercontent.com/FabianGallardo-coder/digibuddy/Master/media/demo.gif)

---

## Get it

**[⬇️ Download installers](https://github.com/FabianGallardo-coder/digibuddy/releases/latest)** — Windows (`.exe`/`.msi`), Linux (`.deb`/AppImage), macOS (`.dmg`).
{: .fs-5 }

Or read the [installation guide]({{ site.baseurl }}/installation/) for details, build-from-source steps, and the Ollama prerequisite.

## What it does

- **Walks** across your desktop — drag it anywhere, always on top.
- **One click** opens a chat powered by your local model via [Ollama](https://ollama.com) (default `dolphin-phi`); if the daemon is offline it falls back to built-in rules.
- **Right-click** menu: Status · Pomodoro (25/5) · Walk · Reminder · Quit.
- **Reads your tuipet save live** (1-second watcher): hatches, evolutions, wins, hunger/dirtiness — it reacts with animations and bubbles, and **never writes `save.json`**.

## Documentation

| Page | What you'll find |
|---|---|
| [Installation]({{ site.baseurl }}/installation/) | Installers, prerequisites, build from source |
| [User guide]({{ site.baseurl }}/user-guide/) | Controls, menu, chat, reminders, model switch |
| [Chat & Ollama]({{ site.baseurl }}/chat-and-ollama/) | How grounding works, offline fallback, privacy |
| [Save watcher]({{ site.baseurl }}/save-watch/) | Read-only guarantee and how the save is resolved |
| [Architecture]({{ site.baseurl }}/architecture/) | Frontend modules, Rust side, data flow |
| [Development]({{ site.baseurl }}/development/) | Setup, tooling, CI, how releases are built |
| [FAQ]({{ site.baseurl }}/faq/) | SmartScreen, legal, models, troubleshooting |
| [Credits]({{ site.baseurl }}/credits/) | MIT code, © Bandai assets, tuipet, NOTICE |

## Quick start

```bash
# 1. Install Ollama and pull the default model
ollama pull dolphin-phi

# 2. Install digibuddy (or build from source)
#    https://github.com/FabianGallardo-coder/digibuddy/releases/latest
```

Building from source:

```bash
npm install
npm run tauri dev
```

More in [Development]({{ site.baseurl }}/development/).

---

digibuddy is a **non-commercial fan project**. Sprites and Digimon are © Bandai; code is MIT.
See [Credits]({{ site.baseurl }}/credits/).
