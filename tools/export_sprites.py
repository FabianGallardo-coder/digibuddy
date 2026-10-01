"""Export tuipet's sprite sheets into digibuddy's frontend assets.

Run once (and after tuipet updates its data):

    pip install tuipet
    python tools/export_sprites.py

Output: public/sprites.json
    { "mons":  { "<num>": { name, stage, attribute, w, h, frames: [11 x (w*h chars)] } },
      "eggs":  [ [frames...] ],           # 46 eggs x 3 frames (idle/settle/crack)
      "roles": { "<anim>": [frame idx] } }  # tuipet's data.ROLES, for pose selection

Frames are 1-bit raster rows joined per frame ("1" = pixel on, "0" = off),
exactly as tuipet stores them — digibuddy renders them itself.
Sprites/names © Bandai — fan/non-commercial use only.
"""
import json
import os
import sys


def main() -> int:
    from tuipet import data, egg

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       os.pardir, "public", "sprites.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)

    _, by_num = data.load_sprites()
    mons = {}
    skipped = 0
    for num, rec in sorted(by_num.items()):
        frames = data.frames_for(num, 0)
        # drop placeholder/empty art (tuipet swaps these at runtime anyway)
        if not any("1" in "".join(fr) for fr in frames):
            skipped += 1
            continue
        mons[str(num)] = {
            "name": rec.get("name", ""),
            "stage": rec.get("stage", ""),
            "attribute": rec.get("attribute", ""),
            "w": int(rec.get("w", 16)),
            "h": int(rec.get("h", 16)),
            "frames": ["".join(fr) for fr in frames],
        }

    eggs = []
    for i in range(egg.count()):
        frames = egg.frames(i)
        eggs.append(["".join(fr) for fr in frames])

    payload = {"mons": mons, "eggs": eggs, "roles": data.ROLES}
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, separators=(",", ":"))

    size = os.path.getsize(out)
    print(f"wrote {out}")
    print(f"  mons: {len(mons)} (skipped {skipped} empty), eggs: {len(eggs)}, "
          f"roles: {len(data.ROLES)}, size: {size / 1024 / 1024:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
