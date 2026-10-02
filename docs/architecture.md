---
title: Architecture
layout: default
nav_order: 6
description: "Frontend modules, Rust backend, data flow and configuration"
---

# Architecture
{: .fs-6 .fw-300 }

Tauri 2 app: TypeScript + Vite frontend, Rust backend, transparent overlay
window.
{: .fs-5 .fw-300 }

## Big picture

```text
┌────────────────────────────────────────────────────────────┐
│                    Transparent Tauri window                │
│  ┌──────────────────── Frontend (TypeScript) ────────────┐ │
│  │ main.ts        bootstrap + menu wiring                │ │
│  │ walk.ts        screen walker (tick loop, drag)        │ │
│  │ sprite.ts      canvas renderer, animations            │ │
│  │ reactions.ts   event → animation/bubble               │ │
│  │ ai.ts          chat client → Rust invoke              │ │
│  │ digipedia.ts   knowledge base injection into prompt   │ │
│  │ save.ts        mirrors save events from Rust          │ │
│  │ pomodoro.ts    25/5 timer + sounds                    │ │
│  │ bestiary.ts    digidex browser UI                     │ │
│  │ db.ts          local SQLite (tauri-plugin-sql)        │ │
│  │ sound.ts       WAV cues (hatch, evolve, battle…)      │ │
│  └───────────────┬───────────────────────────────────────┘ │
│                  │ invoke / events                         │
│  ┌───────────────▼────────────── Rust (src-tauri) ───────┐ │
│  │ lib.rs · Ollama HTTP client (ureq → localhost:11434)  │ │
│  │ lib.rs · save watcher thread (1 s poll, std::thread)  │ │
│  │ lib.rs · menu, opener, app setup                      │ │
│  │ main.rs · entry point                                 │ │
│  └───────────────┬───────────────────────────────────────┘ │
└──────────────────┼─────────────────────────────────────────┘
                   │ read-only                    │ HTTP (local)
          ┌────────▼────────┐            ┌────────▼────────┐
          │  tuipet save.json│            │     Ollama      │
          │  (written by     │            │  dolphin-phi…   │
          │   tuipet only)   │            │  localhost      │
          └──────────────────┘            └─────────────────┘
```

## Frontend modules

| File | Responsibility |
|---|---|
| `src/main.ts` | Boot, IPC wiring, menu actions |
| `src/walk.ts` | Walker tick: random steps, resume after every step, screen bounds, drag |
| `src/sprite.ts` | Draws the 1-bit sprite on canvas, animation frames |
| `src/reactions.ts` | Maps save/chat events to animations and speech bubbles |
| `src/ai.ts` | Chat transport (invokes Rust → Ollama), model from `localStorage` |
| `src/digipedia.ts` | Builds the grounded prompt from `public/digidex.json` |
| `src/save.ts` | Listens to save events from the watcher |
| `src/pomodoro.ts` | Focus timer with sound cues |
| `src/bestiary.ts` + `bestiary.html` | Searchable Digimon bestiary window |
| `src/db.ts` | SQLite via `tauri-plugin-sql` (chat/memory; `.sqlite3` gitignored) |
| `src/sound.ts` | Plays `public/sounds/*.wav` |

## Backend (Rust)

- **Ollama over HTTP**: `ureq` calls `localhost:11434` from Rust — no CORS,
  no exposed ports, works even if the webview is sandboxed.
- **Save watcher**: `std::thread` polls `save.json` every second, diffs state,
  emits Tauri events to the frontend.
- **Crates**: `tauri` 2, `ureq`, `opener`, `tauri-plugin-sql`.

## Key configuration (`src-tauri/tauri.conf.json`)

| Key | Value | Notes |
|---|---|---|
| `identifier` | `com.fabiangallardo.digibuddy` | Determines the local data directory |
| `bundle.targets` | `all` | NSIS + MSI, deb + rpm + AppImage, dmg |
| Window | transparent, always-on-top | The pet floats above other apps |
| CSP | Tauri default | No remote content is loaded |

## Assets pipeline

Sprites and knowledge are **exported from tuipet**, never committed as
originals:

```bash
python tools/export_sprites.py   # → public/sprites.json
python tools/export_digidex.py   # → public/digidex.json
```

Licensing details in [Credits]({{ site.baseurl }}/credits/).

Next: [Development]({{ site.baseurl }}/development/){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 }
