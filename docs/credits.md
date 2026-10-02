---
title: Credits
icon: 📜
layout: default
nav_order: 9
description: "Licensing: MIT code, © Bandai assets, tuipet, NOTICE"
---

# Credits & licensing

## The short version

| What | License / owner |
|---|---|
| Source code of this repo | **MIT** — © 2026 Fabian Gallardo |
| Digimon characters & sprites | **© Bandai** — fan project, not affiliated |
| Built on [tuipet](https://github.com/joeltco/tuipet) | Code © Joel Taylor, **MIT** |
| `public/sounds/`, `public/sprites.json` | Derived from [DVPet](https://theundersigned.itch.io/dvpet) & Digimon — **not covered by this repo's MIT** |

**digibuddy is an independent, non-commercial fan project. Not affiliated with,
sponsored, or endorsed by Bandai.**

## Regenerating the assets

The game-derived files are not shipped as "ours" — they are exported from a
legitimate copy of tuipet:

```bash
python tools/export_sprites.py    # → public/sprites.json
python tools/export_digidex.py    # → public/digidex.json
```

Full details live in the repo's [`NOTICE`](https://github.com/FabianGallardo-coder/digibuddy/blob/Master/NOTICE)
file and tuipet's own `LICENSE`/`NOTICE`.

## Attribution

- [tuipet](https://github.com/joeltco/tuipet) by Joel Taylor
- [DVPet](https://theundersigned.itch.io/dvpet) (sprite/sound source format)
- Ollama for local inference: https://ollama.com
- [Tauri](https://tauri.app) for the app shell

## Contact

Questions or takedown concerns: open an issue on
[GitHub](https://github.com/FabianGallardo-coder/digibuddy/issues) — happy to
adjust attribution or remove anything on request.
