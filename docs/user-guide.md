---
title: User guide
icon: 🎮
layout: default
nav_order: 3
description: "Controls, right-click menu, chat, reminders and model switching"
---

# User guide

How to interact with your digibuddy day to day.

## Controls

| Action | Result |
|---|---|
| *(idle)* | Walks around the screen, stays on top of other windows |
| **Drag** | Click and hold the sprite, move it anywhere |
| **Left-click** | Opens the chat bubble — type and it answers with your local LLM |
| **Right-click** | Opens the menu |

## Right-click menu

| Item | What it does |
|---|---|
| **Status** | Shows the pet's current state (energy, mood, dirty…) |
| **Pomodoro** | 25/5 work–break timer with sound cues |
| **Walk** | Toggle the walker on/off (park the pet in place) |
| **Reminder** | Schedule a reminder from the menu |
| **Quit** | Exit the app |

## Chat

Click the pet and type. Answers come from
[Ollama](https://ollama.com) running **on your machine** — nothing leaves your
computer. The prompt is grounded with the game's knowledge base (1,548 Digimon
facts + your pet's real evolution lines), so it won't invent evolution rules.
If Ollama is offline, digibuddy answers from hand-written fallback rules
instead of failing.

Details: [Chat & Ollama]({{ site.baseurl }}/chat-and-ollama/).

## Reminders from chat

Just ask in natural language:

```text
recordar regar plantas en 5 min
recuerda beber agua en 30 minutos
recordame llamar a mamá en 1 hora
```

`recuerda` / `recordame` / `recordar` all work, and quantities can be written
in words (`un`, `dos`, …). When the time is up the pet pops up with the
reminder.

## Switching models

The default model is `dolphin-phi`. Any model Ollama knows works. Change it
from the browser console (or before packaging):

```js
localStorage.setItem("digibuddy.model", "qwen2.5:7b");
```

Reload the pet afterwards. Popular picks:

| Model | Why |
|---|---|
| `dolphin-phi` | Default — light and fast |
| `qwen2.5:7b` | Better reasoning, still local-friendly |
| `qwen2.5-coder` | If you ask it coding questions |

## Sounds

Hatches, evolutions, battles, feeding — the pet has sounds for the important
events of your tuipet game. Mute your system if the pet is at work with you.

Next: <a class="btn btn-primary" href="{{ site.baseurl }}/chat-and-ollama/">Chat & Ollama</a>
