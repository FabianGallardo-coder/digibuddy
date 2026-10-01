// digipedia — digibuddy's OWN knowledge of Digimon: what they are, the stage
// ladder, the attribute triangle, the curated evolution lines (tuipet's
// LINES_SPEC data, verified against humulos) and, above all, ITSELF: which
// line it hatched from and what it can still become.
//
// Everything comes from public/digidex.json (tools/export_digidex.py), so
// this can never drift from what the game actually does.
import { PetState } from "./save";

export interface DexMon {
  n: string; // name
  s: string; // stage key (Egg | Fresh | ... | Mega)
  a: string; // attribute (Vaccine | Data | Virus | None)
  el: string; // element (Fire, Ice, ...)
  f: string; // field (NatureSpirit, MetalEmpire, ...)
  to: number[]; // corpus evolution targets
}

export interface DexRow {
  n: number;
  s: string;
  p: number[]; // parent dexes
  r: string; // raw rule ("CM 0-2, TR 16+")
  es: string; // the same rule in Spanish
  note: string;
}

export interface DexLine {
  root: number;
  name: string;
  rows: DexRow[];
}

interface Dex {
  stages: { k: string; es: string; desc: string }[];
  attrs: { k: string; es: string; desc: string }[];
  mons: Record<string, DexMon>;
  lines: Record<string, DexLine>;
}

let dex: Dex | null = null;
let pending: Promise<boolean> | null = null;

const STAGE_RANK = ["Egg", "Fresh", "InTraining", "Rookie", "Champion", "Ultimate", "Mega"];

const fold = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Fetch digidex.json once; resolves false when the asset is missing. */
export function load(): Promise<boolean> {
  if (dex) return Promise.resolve(true);
  if (pending) return pending;
  pending = fetch("/digidex.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((d: Dex | null) => {
      if (!d || !d.mons) throw new Error("digidex vacio");
      dex = d;
      return true;
    })
    .catch(() => false);
  return pending;
}

export function ready(): boolean {
  return dex !== null;
}

export function monOf(num: number): DexMon | undefined {
  return dex?.mons[String(num)];
}

export function stageEs(k: string): string {
  return dex?.stages.find((s) => s.k === k)?.es ?? k;
}

export function attrEs(k: string): string {
  return dex?.attrs.find((a) => a.k === k)?.es ?? k;
}

export function findByName(q: string): { num: number; mon: DexMon } | null {
  if (!dex) return null;
  const needle = fold(q.trim());
  if (!needle) return null;
  let partial: { num: number; mon: DexMon } | null = null;
  for (const [k, mon] of Object.entries(dex.mons)) {
    const nm = fold(mon.n);
    if (nm === needle) return { num: Number(k), mon };
    if (!partial && nm.startsWith(needle)) partial = { num: Number(k), mon };
  }
  return partial;
}

export interface LineHit {
  id: string;
  line: DexLine;
  at: number; // the dex PRESENT in the line (may differ from `num`: the roster
  // keeps 2-3 dexes per species, while lines.csv only names the canonical one)
}

const pickLine = (hits: LineHit[]): LineHit =>
  // 16 Baby names root several lines; tuipet takes the LOWEST root (the
  // classic chart), never CSV order.
  [...hits].sort((a, b) => a.line.root - b.line.root)[0];

/** The curated line containing `num` (null = the pet evolves by the corpus). */
export function lineOf(num: number): LineHit | null {
  if (!dex) return null;
  const direct: LineHit[] = [];
  for (const [id, line] of Object.entries(dex.lines)) {
    if (line.rows.some((r) => r.n === num)) direct.push({ id, line, at: num });
  }
  if (direct.length) return pickLine(direct);

  // same species under another dex: match the line by NAME (dex sync is by
  // name in tuipet itself), so an Agumon hatched as dex 56 still finds ver1.
  const name = fold(monOf(num)?.n ?? "");
  if (!name) return null;
  const byName: LineHit[] = [];
  for (const [id, line] of Object.entries(dex.lines)) {
    const row = line.rows.find((r) => r.note && fold(r.note) === name);
    if (row) byName.push({ id, line, at: row.n });
  }
  return byName.length ? pickLine(byName) : null;
}

/** root -> ... -> `num`, following parent links (first parent on forks). */
export function chainTo(line: DexLine, num: number): DexRow[] {
  const byNum = new Map<number, DexRow>(line.rows.map((r) => [r.n, r]));
  const chain: DexRow[] = [];
  let cur = byNum.get(num);
  const seen = new Set<number>();
  while (cur && !seen.has(cur.n)) {
    seen.add(cur.n);
    chain.unshift(cur);
    const parent = cur.p.find((p) => byNum.has(p));
    cur = parent === undefined ? undefined : byNum.get(parent);
  }
  return chain;
}

const arrow = (chain: DexRow[]): string =>
  chain.map((r) => `${r.note || r.n} (${stageEs(r.s)})`).join(" -> ");

/** What this Digimon can become at its NEXT stage, rule included. */
export function nextSteps(num: number): { name: string; rule: string }[] {
  if (!dex) return [];
  const me = monOf(num);
  const rank = STAGE_RANK.indexOf(me?.s ?? "");
  const hit = lineOf(num);
  if (hit) {
    const parents = new Set<number>([hit.at]);
    return hit.line.rows
      .filter((r) => r.p.some((p) => parents.has(p)) && STAGE_RANK.indexOf(r.s) > rank)
      .map((r) => ({ name: r.note || String(r.n), rule: r.es }));
  }
  return (me?.to ?? [])
    .map((t) => monOf(t))
    .filter((m): m is DexMon => !!m && STAGE_RANK.indexOf(m.s) > rank)
    .slice(0, 4)
    .map((m) => ({ name: m.n, rule: "" }));
}

const lineText = (num: number): string => {
  const hit = lineOf(num);
  if (!hit) return "";
  return arrow(chainTo(hit.line, hit.at));
};

/** The compact grounding block injected into the system prompt. */
export function selfDossier(s: PetState): string {
  if (!dex) return "";
  const stages = dex.stages.map((x) => x.es).join(" -> ");
  const attrs = dex.attrs
    .filter((a) => a.k !== "None")
    .map((a) => a.es)
    .join(" > ");
  const parts = [
    `CONCIENCIA DIGIMON: un Digimon es una criatura digital de la franquicia Bandai (1997), ` +
      `nace de un digihuevo y digievoluciona por cuidado. Etapas: ${stages}. ` +
      `Atributos en triangulo (quien vence a quien): ${attrs} > Vacuna.`,
  ];
  const me = monOf(s.num);
  const chain = lineText(s.num);
  if (chain) {
    parts.push(`TU LINEA (la de tu huevo): ${chain}.`);
  } else if (me) {
    parts.push(`No tienes linea curada: evolucionas por el grafo general del juego.`);
  }
  const steps = nextSteps(s.num)
    .slice(0, 3)
    .map((x) => (x.rule ? `${x.name} (${x.rule})` : x.name));
  if (steps.length) {
    parts.push(
      `ERES ${me?.n ?? s.name}, etapa ${stageEs(s.stage)}, atributo ` +
        `${attrEs(s.attribute)}${me?.el ? `, elemento ${me.el}` : ""}. ` +
        `Tu siguiente digievolution posible: ${steps.join(", ")}.`,
    );
  }
  parts.push(
    `Si te preguntan por digimon, etapas, atributos o evoluciones, usa SOLO estos datos. ` +
      `Si algo no aparece, dilo honestamente: no inventes nombres. Digimon (c) Bandai, fan no comercial.`,
  );
  return parts.join(" ");
}

export function whatIsADigimon(): string {
  if (!dex) return "";
  const stages = dex.stages.map((x) => x.es).join(" -> ");
  return (
    `Un Digimon es una criatura digital que vive en el Mundo Digital: nace de un ` +
    `digihuevo, crece y digievoluciona segun como lo cuides. Etapas: ${stages}. ` +
    `Atributos: Vacuna > Virus > Datos > Vacuna. Aqui hay ${Object.keys(dex.mons).length} ` +
    `registrados y ${Object.keys(dex.lines).length} lineas de evolucion.`
  );
}

/**
 * Grounded local answer for the questions digibuddy must never fumble —
 * returns null when this isn't one of them (the caller falls back to rules).
 */
export function localAnswer(s: PetState, msg: string): string | null {
  if (!dex) return null;
  const m = fold(msg);

  if (/(que es|que son|explica)\s+(un\s+)?digimon/.test(m)) return whatIsADigimon();

  if (/(etapas|estadios|cuantas etapas)/.test(m)) {
    return `Las etapas son: ${dex.stages.map((x) => x.es).join(" -> ")}. Cada una ` +
      `pide cuidados distintos para llegar a la siguiente.`;
  }

  if (/(triangulo|cual le gana|atributos)/.test(m)) {
    return `Atributos: ${dex.attrs.map((a) => `${a.es} (${a.desc})`).join(". ")}.`;
  }

  const mine = /(mi linea|tu linea|en que te vas a evolucionar|me voy a evolucionar|mis evoluciones|tu evolucion)/.test(m);
  if (mine) {
    const chain = lineText(s.num);
    const steps = nextSteps(s.num).slice(0, 3);
    const stepTxt = steps.length
      ? steps.map((x) => (x.rule ? `${x.name} — ${x.rule}` : x.name)).join("; ")
      : "nada por ahora";
    const chainTxt = chain || "sin linea curada (evoluciono por el grafo general)";
    return `Mi linea: ${chainTxt}. Siguiente paso: ${stepTxt}.`;
  }

  const named = /evoluci|linea de|de que se evoluciona|quien es/.test(m);
  if (named) {
    for (const [k, mon] of Object.entries(dex.mons)) {
      const nm = fold(mon.n);
      if (nm.length > 3 && m.includes(nm)) {
        const chain = lineText(Number(k));
        if (chain) return `${mon.n} (${stageEs(mon.s)}, ${attrEs(mon.a)}): ${chain}.`;
        const steps = nextSteps(Number(k)).slice(0, 3);
        return steps.length
          ? `${mon.n} (${stageEs(mon.s)}): puede pasar a ${steps.map((x) => x.name).join(", ")}.`
          : `${mon.n} (${stageEs(mon.s)}): no tengo su siguiente forma.`;
      }
    }
  }
  return null;
}
