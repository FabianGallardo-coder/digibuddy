---
title: Save watcher
icon: 🛡️
layout: default
nav_order: 5
description: "The read-only guarantee: how the save is found, watched and never written"
---

# Save watcher

digibuddy **never writes `save.json`**. It only mirrors what tuipet saves.

## Where the save is found

Resolution order (first hit wins), exactly like tuipet resolves it:

1. `$TUIPET_SAVE_DIR/save.json` — explicit override
2. `$XDG_DATA_HOME/tuipet/save.json` — XDG aware systems
3. `~/.local/share/tuipet/save.json` — default

```bash
# dev/testing with a copy of a save
TUIPET_SAVE_DIR="/path/to/save" npm run tauri dev
# PowerShell: $env:TUIPET_SAVE_DIR="C:\path\to\save"
```

## The watcher

A dedicated Rust `std::thread` polls the file **once per second** and emits
events to the frontend when something relevant changes. The pet reacts to:

| Event | Reaction |
|---|---|
| Egg hatches | Celebration animation + bubble |
| Digivolution | Evolution fanfare |
| Battle won/lost | Cheer / commiseration |
| Hunger / dirty | Reminds you to care for it |
| Poop | Disgusted reaction 😅 |

The frontend also keeps its own local state (pomodoro, chat history) in a
gitignored SQLite file — completely separate from the game save.

## The guarantee

- **Reads**: `save.json` opened read-only, parsed, mirrored.
- **Writes**: none. tuipet is the only writer.
- The save is never locked — tuipet keeps saving normally while digibuddy watches.
- If the file is missing (game not installed yet), the pet still walks and
  chats; save reactions simply activate when a save appears.

This is what lets the pet "live" with your game without any risk of
corruption: even a crash of digibuddy can't damage your progress.

Next: <a class="btn btn-primary" href="{{ site.baseurl }}/architecture/">Architecture</a>
