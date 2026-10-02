---
title: FAQ
icon: ❓
layout: default
nav_order: 8
description: "SmartScreen, Gatekeeper, models, save safety, legal"
---

# FAQ

## Windows warns me — "Windows protected your PC"

The installer is **unsigned** (code-signing certificates cost money). Click
**More info → Run anyway**. Same for the app executable.

## macOS says the app "can't be opened"

Right-click the app → **Open** → **Open**. Only needed the first time
(Gatekeeper quarantine).

## Is it free? Does it collect anything?

Free and open source (MIT). **No telemetry, no analytics, no accounts, no
cloud.** The only network traffic is to `localhost` (Ollama) if you use chat.

## Will it corrupt my save?

No. digibuddy opens `save.json` **read-only**, never writes it, never locks
it — see [Save watcher]({{ site.baseurl }}/save-watch/).

## Do I need Ollama?

Only for the AI chat. The pet, walker, save reactions, pomodoro and reminders
all work without it — chat then answers from built-in fallback rules.

## Which models work?

Any Ollama model. Default is `dolphin-phi`; switch with:

```js
localStorage.setItem("digibuddy.model", "qwen2.5:7b");
```

## How do I close it?

Right-click → **Quit**.

## It doesn't see my game

digibuddy resolves the save like tuipet does. Point it explicitly:

```bash
TUIPET_SAVE_DIR="/path/to/save" npm run tauri dev
```

If no save exists yet, everything except save reactions still works.

## Is this affiliated with Bandai?

**No.** Fan project, non-commercial. Digimon and its sprites are © Bandai,
tuipet is by Joel Taylor (MIT). Full details in
[Credits]({{ site.baseurl }}/credits/).

## Can I use it for my own virtual pet?

The code is MIT — yes. The sprites/knowledge files are derived from tuipet and
Digimon assets and must be regenerated from your own copy (see
[Development]({{ site.baseurl }}/development/)).

Next: <a class="btn btn-primary" href="{{ site.baseurl }}/credits/">Credits</a>
