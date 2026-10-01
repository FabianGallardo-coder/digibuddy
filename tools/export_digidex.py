"""Export tuipet's Digimon KNOWLEDGE into digibuddy's frontend assets.

Run once (and after tuipet updates its data):

    pip install tuipet
    python tools/export_digidex.py

Output: public/digidex.json
    {
      "stages": [ { k, es, desc } ... ],          # Huevo -> Mega, in game order
      "attrs":  [ { k, es, desc } ... ],          # Vacuna / Datos / Virus
      "mons":   { "<num>": { n, s, a, el, f, to: [nums] } },
      "lines":  { "<lineId>": { root, name,
                                rows: [{ n, s, p, r, es, note }] } }
    }

`mons` is the roster (name/stage/attribute/element/field) plus the corpus
evolution graph; `lines` is tuipet's curated LINES_SPEC subtree with the
care rule that unlocks each step, already translated to Spanish.

Ground truth: tuipet's own data/, which is verified against humulos — so
digibuddy's "conciencia" can never drift from what the game actually does.
Digimon names/designs (C) Bandai - fan/non-commercial use only.
"""
import json
import os
import sys

STAGES_ES = [
    ("Egg", "Huevo", "Aun no ha eclosionado: no come, no pelea, solo espera."),
    ("Fresh", "Bebe I", "Recien nacido digital (digihuevo). Etapa minima: apenas se mueve."),
    ("InTraining", "Bebe II", "En entrenamiento: ya se mueve y aprende sus primeras carencias."),
    ("Rookie", "Rookie", "La forma propia de cada Digimon: es la que la gente recuerda."),
    ("Champion", "Campeon", "Primera digievolution de combate. Cuidado y experiencia la abren."),
    ("Ultimate", "Ultra", "Forma de elite; en tuipet exige entrenos y victorias sostenidas."),
    ("Mega", "Mega", "La cima. Pocos llegan: requiere una etapa impecable."),
]

ATTRS_ES = [
    ("Vaccine", "Vacuna", "Purifica datos. Vence a Virus, pierde contra Datos."),
    ("Data", "Datos", "Equilibrado y adaptable. Vence a Vacuna, pierde contra Virus."),
    ("Virus", "Virus", "Se propaga y corrompe. Vence a Datos, pierde contra Vacuna."),
    ("None", "Sin atributo", "Formas sin atributo asignado (huevos y bebés)."),
]

# tuipet's own rule vocabulary (lines._TXT) -> plain Spanish
_ATOM_ES = {
    "CM": "{a} descuidos",
    "TR": "{a} entrenos",
    "OF": "{a} atracones",
    "BTL": "{a} combates en la etapa",
    "KO6": "{a} Mega abatidos",
    "LV": "nivel DMX {a}",
    "AREA": "{a} jefes de raid abatidos",
}


def _atom_es(part):
    """'CM 0-2' -> '0-2 descuidos'; 'TIME'/'' -> None (no requirement)."""
    p = part.strip()
    if not p or p.upper() == "TIME":
        return None
    kind, _, arg = p.partition(" ")
    k, arg = kind.upper(), arg.strip()
    if k in _ATOM_ES:
        return _ATOM_ES[k].format(a=arg)
    if k == "WIN":
        a, _, b = arg.partition("/")
        return f"{a} victorias de las ultimas {b}"
    if k == "JOGRESS":
        return "fusion (jogress) con ese compañero"
    return p


def rule_es(text):
    """'CM 0-2, TR 16+' -> '0-2 descuidos y 16+ entrenos'.  Coma = AND, | = OR."""
    alts = []
    for alt in (text or "").split("|"):
        atoms = [a for a in (_atom_es(x) for x in alt.split(",")) if a]
        if atoms:
            alts.append(" y ".join(atoms))
    return " o ".join(alts) if alts else "solo el tiempo de etapa"


def main() -> int:
    from tuipet import data, lines

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       os.pardir, "public", "digidex.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)

    _, by_num = data.load_sprites()
    evo = data.load_evolutions()

    mons = {}
    for num, rec in sorted(by_num.items()):
        name = (rec.get("name") or "").strip()
        if not name:
            continue
        mons[str(num)] = {
            "n": name,
            "s": (rec.get("stage") or "").strip(),
            "a": (rec.get("attribute") or "None").strip(),
            "el": (rec.get("element") or "").strip(),
            "f": (rec.get("field") or "").strip(),
            "to": evo.get(num, []),
        }

    dex_lines = {}
    for lid, line in lines.load_lines().items():
        root = line["root"]
        rows = []
        for num, row in sorted(line["members"].items()):
            rec = by_num.get(num) or {}
            rows.append({
                "n": num,
                "s": row["stage"],
                "p": row["parents"],
                "r": row["rule_text"],
                "es": rule_es(row["rule_text"]),
                "note": (rec.get("name") or "").strip(),
            })
        dex_lines[lid] = {
            "root": root,
            "name": (by_num.get(root) or {}).get("name", "") or lid,
            "rows": rows,
        }

    payload = {
        "stages": [{"k": k, "es": es, "desc": d} for k, es, d in STAGES_ES],
        "attrs": [{"k": k, "es": es, "desc": d} for k, es, d in ATTRS_ES],
        "mons": mons,
        "lines": dex_lines,
    }
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))

    size = os.path.getsize(out)
    print(f"wrote {out}")
    print(f"  mons: {len(mons)}, lines: {len(dex_lines)}, "
          f"size: {size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
