---
title: Chat & Ollama
icon: 🧠
layout: default
nav_order: 4
description: "Local LLM chat, digipedia grounding, offline fallback and privacy"
---

# Chat & Ollama

The chat runs 100% on your machine through
[Ollama](https://ollama.com) — no cloud, no API keys, no telemetry.

## How a message travels

```text
you type → frontend (src/ai.ts)
         → Rust backend (src-tauri): HTTP call to http://localhost:11434
         → Ollama generates a reply
         → bubble on screen
```

The request is made from **Rust**, not the browser view, so there is no CORS
hassle and no external network hop.

## Grounding: why it doesn't lie about Digimon

A generic chat model hallucinates evolution lines. digibuddy injects a local
knowledge base — the **digipedia** — straight into the prompt:

- **1,548 Digimon entries** (stages, attributes, skills)
- **All 51 tuipet evolution lines** with each step's care rules
  (e.g. Botamon → Koromon → Agumon; Meramon needs 3+ care mistakes)
- What a Digimon is, the 7 stages, the attribute triangle

The file `public/digidex.json` *is* the pet's awareness; it is loaded by
`src/digipedia.ts` and appended to the prompt. Questions about the pet itself
are answered locally, so the model can't invent them.

Regenerate it after a tuipet update:

```bash
python tools/export_digidex.py
```

## Offline fallback

If Ollama doesn't answer (daemon down, model missing), digibuddy switches to
**hand-written rules** so the pet never just errors out. You'll notice the
answers become simpler — that's the fallback talking.

## Choosing models

```js
// browser console, then reload
localStorage.setItem("digibuddy.model", "qwen2.5:7b");
```

Any Ollama model tag works: `ollama pull <tag>` first.

## Privacy summary

| Data | Leaves your machine? |
|---|---|
| Chat messages | **No** — localhost Ollama only |
| Game save | **No** — read locally, never written |
| Telemetry / analytics | **None** — none exists |
| Update checks | **None** — install manually from Releases |

Next: <a class="btn btn-primary" href="{{ site.baseurl }}/save-watch/">Save watcher</a>
