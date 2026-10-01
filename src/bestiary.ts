import { getCurrentWindow } from "@tauri-apps/api/window";
import { chainTo, lineOf, load as loadDex, nextSteps } from "./digipedia";

interface MonRec {
  name: string;
  stage: string;
  attribute: string;
  w: number;
  h: number;
  frames: string[];
}

interface SpriteData {
  mons: Record<string, MonRec>;
  eggs: string[][];
  roles: Record<string, number[]>;
}

interface Mon extends MonRec {
  id: string;
}

const ATTR_COLORS: Record<string, string> = {
  Vaccine: "#37b24d",
  Data: "#4dabf7",
  Virus: "#b06ae0",
  None: "#f76707",
};

const STAGES = ["Fresh", "InTraining", "Rookie", "Champion", "Ultimate", "Mega"];
const ATTRS = ["Vaccine", "Virus", "Data", "None"];
const CHUNK = 60;

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`falta ${sel}`);
  return el as T;
};

const listEl = $<HTMLElement>("#bx-list");
const countEl = $<HTMLElement>("#bx-count");
const moreBtn = $<HTMLButtonElement>("#bx-more");
const footEl = $<HTMLElement>("#bx-foot");
const qEl = $<HTMLInputElement>("#bx-q");
const stagesEl = $<HTMLElement>("#bx-stages");
const attrsEl = $<HTMLElement>("#bx-attrs");
const detailEl = $<HTMLElement>("#bx-detail");
const spriteEl = $<HTMLCanvasElement>("#bx-sprite");
const metaEl = $<HTMLElement>("#bx-meta");

let all: Mon[] = [];
let filtered: Mon[] = [];
let shown = 0;
let query = "";
let stage = "";
let attr = "";
let idleSeq: number[] = [0, 1];
let animTimer = 0;
let detailMon: Mon | null = null;

function drawFrame(cv: HTMLCanvasElement, mon: MonRec, idx: number): void {
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  cv.width = mon.w;
  cv.height = mon.h;
  ctx.clearRect(0, 0, mon.w, mon.h);
  const fr = mon.frames[idx] ?? mon.frames[0];
  if (!fr) return;
  ctx.fillStyle = ATTR_COLORS[mon.attribute] ?? "#f76707";
  for (let i = 0; i < fr.length; i++) {
    if (fr[i] === "1") ctx.fillRect(i % mon.w, Math.floor(i / mon.w), 1, 1);
  }
}

function chip(label: string, color?: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "bx-chip";
  b.dataset.value = label;
  if (color) {
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = color;
    b.appendChild(dot);
  }
  b.appendChild(document.createTextNode(label));
  return b;
}

function applyFilters(): void {
  const needle = query.trim().toLowerCase();
  filtered = all.filter(
    (m) =>
      (!stage || m.stage === stage) &&
      (!attr || m.attribute === attr) &&
      (!needle || m.name.toLowerCase().includes(needle)),
  );
  shown = 0;
  listEl.innerHTML = "";
  renderMore();
}

function renderMore(): void {
  const slice = filtered.slice(shown, shown + CHUNK);
  if (shown === 0 && slice.length === 0) {
    const e = document.createElement("div");
    e.className = "bx-empty";
    e.textContent = "Ningún digimon coincide con el filtro.";
    listEl.appendChild(e);
  }
  for (const mon of slice) {
    const card = document.createElement("div");
    card.className = "bx-card";
    const cv = document.createElement("canvas");
    cv.width = 16;
    cv.height = 16;
    drawFrame(cv, mon, 0);
    const txt = document.createElement("div");
    const nm = document.createElement("div");
    nm.className = "bx-name";
    nm.textContent = mon.name;
    const sub = document.createElement("div");
    sub.className = "bx-sub";
    sub.textContent = `${mon.stage} · ${mon.attribute}`;
    txt.append(nm, sub);
    card.append(cv, txt);
    card.addEventListener("click", () => openDetail(mon));
    listEl.appendChild(card);
  }
  shown += slice.length;
  footEl.classList.toggle("show", shown < filtered.length);
  countEl.textContent = `${filtered.length} de ${all.length} digimon`;
}

function openDetail(mon: Mon): void {
  detailMon = mon;
  spriteEl.style.background = "#0b0b16";
  spriteEl.style.border = `2px solid ${ATTR_COLORS[mon.attribute] ?? "#f76707"}`;

  const tags = document.createElement("div");
  tags.className = "bx-tags";
  tags.appendChild(chip(mon.stage, "#7ee787"));
  tags.appendChild(chip(mon.attribute, ATTR_COLORS[mon.attribute]));

  const table = document.createElement("table");
  const rows: [string, string][] = [
    ["Nombre", mon.name],
    ["ID", mon.id],
    ["Etapa", mon.stage],
    ["Atributo", mon.attribute],
    ["Tamaño", `${mon.w} × ${mon.h} px`],
    ["Frames", String(mon.frames.length)],
  ];

  // digipedia: the evolution line this form belongs to, and what it becomes
  const num = Number(mon.id);
  const hit = lineOf(num);
  if (hit) {
    const chain = chainTo(hit.line, hit.at);
    rows.push(["Línea", chain.map((r) => r.note || String(r.n)).join(" → ")]);
    const last = chain[chain.length - 1];
    if (last && hit.at !== hit.line.root) {
      rows.push(["Entró aquí con", last.es]);
    }
  }
  const steps = nextSteps(num);
  if (steps.length) {
    rows.push([
      "Digievoluciona a",
      steps.map((x) => (x.rule ? `${x.name} (${x.rule})` : x.name)).join(" · "),
    ]);
  }
  for (const [k, v] of rows) {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    td1.textContent = k;
    const td2 = document.createElement("td");
    td2.textContent = v;
    tr.append(td1, td2);
    table.appendChild(tr);
  }

  metaEl.innerHTML = "";
  const h2 = document.createElement("h2");
  h2.textContent = mon.name;
  metaEl.append(h2, tags, table);

  detailEl.classList.remove("bx-hidden");
  startAnim();
}

function startAnim(): void {
  window.clearInterval(animTimer);
  if (!detailMon) return;
  let i = 0;
  drawFrame(spriteEl, detailMon, idleSeq[0]);
  animTimer = window.setInterval(() => {
    if (!detailMon) return;
    i = (i + 1) % idleSeq.length;
    drawFrame(spriteEl, detailMon, idleSeq[i]);
  }, 200);
}

function closeDetail(): void {
  window.clearInterval(animTimer);
  animTimer = 0;
  detailMon = null;
  detailEl.classList.add("bx-hidden");
}

function buildChips(): void {
  const allStage = chip("Todas");
  allStage.classList.add("on");
  allStage.addEventListener("click", () => {
    stage = "";
    for (const c of stagesEl.children) c.classList.remove("on");
    allStage.classList.add("on");
    applyFilters();
  });
  stagesEl.appendChild(allStage);
  for (const s of STAGES) {
    const c = chip(s);
    c.addEventListener("click", () => {
      stage = s;
      for (const x of stagesEl.children) x.classList.remove("on");
      c.classList.add("on");
      applyFilters();
    });
    stagesEl.appendChild(c);
  }

  const allAttr = chip("Todos");
  allAttr.classList.add("on");
  allAttr.addEventListener("click", () => {
    attr = "";
    for (const c of attrsEl.children) c.classList.remove("on");
    allAttr.classList.add("on");
    applyFilters();
  });
  attrsEl.appendChild(allAttr);
  for (const a of ATTRS) {
    const c = chip(a, ATTR_COLORS[a]);
    c.addEventListener("click", () => {
      attr = a;
      for (const x of attrsEl.children) x.classList.remove("on");
      c.classList.add("on");
      applyFilters();
    });
    attrsEl.appendChild(c);
  }
}

async function boot(): Promise<void> {
  buildChips();
  await loadDex(); // bestiary knowledge: evolution lines (local asset, fast)

  let data: SpriteData;
  try {
    const res = await fetch("/sprites.json");
    data = (await res.json()) as SpriteData;
  } catch {
    countEl.textContent = "no pude cargar sprites.json";
    return;
  }

  idleSeq = data.roles.idle ?? [0, 1];
  all = Object.keys(data.mons)
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => ({ id, ...data.mons[id] }));
  applyFilters();

  qEl.addEventListener("input", () => {
    query = qEl.value;
    applyFilters();
  });
  moreBtn.addEventListener("click", renderMore);
  $<HTMLButtonElement>("#bx-back").addEventListener("click", closeDetail);
  $<HTMLButtonElement>("#bx-close").addEventListener("click", () => {
    void getCurrentWindow().close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (detailMon) closeDetail();
      else void getCurrentWindow().close();
    }
    if (e.key === "/" && document.activeElement !== qEl) {
      e.preventDefault();
      qEl.focus();
    }
  });
}

void boot();
