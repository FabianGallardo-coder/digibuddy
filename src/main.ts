// digibuddy — desktop companion for tuipet (read-only data, AI hybrid rules + Ollama).
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { SpriteRenderer } from "./sprite";
import { diff, moodWord, parseSave, PetState, SaveEvent } from "./save";
import { ambient, needsReaction, onEvent, Reaction } from "./reactions";
import { chat, ChatTurn } from "./ai";
import { load as loadDex } from "./digipedia";
import { getVolume, play, setVolume } from "./sound";
import {
  addMessage,
  addReminder,
  completeReminder,
  logEvent,
  openDb,
  pendingReminders,
  recentMessages,
} from "./db";
import { Walker } from "./walk";
import { Pomodoro } from "./pomodoro";

// one sound per save event, from the shared tuipet wav bank
const EVENT_SOUND: Record<SaveEvent, string> = {
  hatched: "hatch",
  evolved: "evolve",
  egg: "click",
  win: "win",
  death: "death",
  cured: "confirm",
};

// urgency 3/2/1 → the game's own alarm / angry / refuse
const NEED_SOUND = ["refuse", "angry", "alarm"];

const $ = <T extends HTMLElement>(sel: string): T =>
  document.querySelector(sel) as T;

const bubbleEl = $<HTMLDivElement>("#bubble");
const panelEl = $<HTMLDivElement>("#panel");
const petEl = $<HTMLDivElement>("#pet");
const badgeEl = $<HTMLDivElement>("#badge");
const sprite = new SpriteRenderer($<HTMLCanvasElement>("#sprite"));

let state: PetState | null = null;
let history: ChatTurn[] = [];
let bubbleTimer = 0;
let lastAmbient = 0;
let panelOpen = false;
let chatMode = false;
// need latch: fire on onset, then re-nag every 90 s (the game's own _nag_t)
let lastNeedKey: string | null = null;
let nextNeedNag = 0;

/* ---------- bubble ---------- */

function say(text: string, ms = 6000): void {
  bubbleEl.textContent = text;
  bubbleEl.classList.remove("hidden");
  clearTimeout(bubbleTimer);
  if (ms > 0) bubbleTimer = window.setTimeout(hideBubble, ms);
}

function hideBubble(): void {
  if (!chatMode) bubbleEl.classList.add("hidden");
}

function react(r: Reaction | null): void {
  if (!r) return;
  sprite.setRole(r.anim);
  say(r.text);
}

/* ---------- launching tuipet ---------- */

interface TuipetStatus {
  pid: number | null;
  sound: boolean;
}

async function launchTuipet(): Promise<void> {
  say("Abriendo tuipet…", 4000);
  try {
    const res = await invoke<string>("launch_tuipet");
    say(res, 6000);
  } catch (e) {
    say(`No pude abrir tuipet: ${e}`, 8000);
  }
}

async function statusLine(): Promise<string> {
  const st = await invoke<TuipetStatus>("tuipet_status").catch(() => null);
  if (!st) return "tuipet: ?";
  const run = st.pid ? `corriendo (pid ${st.pid})` : "no corriendo";
  return `tuipet: ${run} ·· sonido ${st.sound ? "on" : "off"}`;
}

/* ---------- bestiary (secondary window) ---------- */

async function openBestiary(): Promise<void> {
  const existing = await WebviewWindow.getByLabel("bestiary").catch(() => null);
  if (existing) {
    await existing.setFocus().catch(() => {});
    closePanel();
    return;
  }
  const win = new WebviewWindow("bestiary", {
    url: "bestiary.html",
    title: "Bestiario",
    width: 820,
    height: 600,
    minWidth: 560,
    minHeight: 400,
    center: true,
    resizable: true,
    decorations: true,
    shadow: true,
  });
  void win.once("tauri://error", (e) => {
    say(`No pude abrir el bestiario: ${JSON.stringify(e.payload)}`, 6000);
  });
  closePanel();
}

/* ---------- panel (menu / chat) ---------- */

function closePanel(): void {
  panelOpen = false;
  chatMode = false;
  panelEl.classList.remove("chat");
  panelEl.classList.add("hidden");
  bubbleEl.classList.add("hidden");
  walker.paused = false;
}

function openMenu(): void {
  chatMode = false;
  panelOpen = true;
  walker.paused = true;
  panelEl.classList.remove("chat");
  bubbleEl.classList.add("hidden");
  panelEl.innerHTML = "";
  play("click");
  const items: [string, () => void][] = [
    ["Abrir tuipet", () => void launchTuipet()],
  ];
  if (state) {
    items.push(
      [
        "Estado",
        async () => {
          const line = await statusLine();
          closePanel();
          say(
            `${state!.name} · ${state!.stage} · ${moodWord(state!)}\n` +
              `Fuerza ${state!.strength} · Energía ${state!.energy}/${state!.max_energy} · ` +
              `Hambre ${state!.hunger}/4 · Bits ${state!.bits} · Victorias ${state!.wins}\n` +
              line,
            8000,
          );
        },
      ],
      [
        pomodoro.running ? "Pomodoro: pausar" : "Pomodoro: 25 min",
        () => {
          pomodoro.toggle();
          closePanel();
          if (pomodoro.running)
            say(pomodoro.phase === "work" ? "🍅 ¡25 minutos de foco!" : "☕ Pausa de 5 minutos.");
        },
      ],
      [
        walker.enabled ? "Paseo: pausar" : "Paseo: activar",
        () => {
          walker.enabled = !walker.enabled;
          closePanel();
          say(walker.enabled ? "¡A pasear!" : "Me quedo quieto aquí.");
        },
      ],
      ["Recordatorio", () => openChat("recordar ")],
    );
  }
  items.push(
    ["Bestiario", () => void openBestiary()],
    [
      getVolume() > 0 ? "Sonido: apagar" : "Sonido: encender",
      () => {
        const on = getVolume() > 0;
        setVolume(on ? 0 : 0.8);
        if (!on) play("confirm");
        closePanel();
        say(on ? "🔇 Sonido apagado." : "🔊 Sonido activado.", 3000);
      },
    ],
    ["Salir", () => void getCurrentWindow().close()],
  );
  for (const [label, fn] of items) {
    const b = document.createElement("button");
    b.className = "item";
    b.textContent = label;
    b.addEventListener("click", fn);
    panelEl.appendChild(b);
  }
  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = "clic = chat · clic derecho = menú";
  panelEl.appendChild(hint);
  panelEl.classList.remove("hidden");
}

function renderChatLog(): void {
  const log = document.getElementById("chat-log");
  if (!log) return;
  log.innerHTML = "";
  if (history.length === 0) {
    const hint = document.createElement("div");
    hint.className = "msg empty";
    hint.textContent = `Habla con ${state ? state.name : "mí"}…`;
    log.appendChild(hint);
  }
  for (const t of history) {
    const row = document.createElement("div");
    row.className = `msg ${t.role}`;
    row.textContent = t.content;
    log.appendChild(row);
  }
  log.scrollTop = log.scrollHeight;
}

function openChat(prefill = ""): void {
  if (!state) return;
  chatMode = true;
  panelOpen = true;
  walker.paused = true;
  panelEl.classList.add("chat");
  panelEl.innerHTML = "";
  const log = document.createElement("div");
  log.id = "chat-log";
  const input = document.createElement("input");
  input.id = "chat-input";
  input.placeholder = `Habla con ${state.name}...`;
  input.maxLength = 300;
  input.value = prefill;
  panelEl.appendChild(log);
  panelEl.appendChild(input);
  panelEl.classList.remove("hidden");
  renderChatLog(); // the pet never speaks over itself here: the transcript lives
  window.setTimeout(() => input.focus(), 30);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePanel();
      return;
    }
    if (e.key !== "Enter") return;
    const msg = input.value.trim();
    if (!msg) return;
    input.value = "";
    play("select");
    void handleUserMessage(msg);
  });
}

/* ---------- reminders (persisted: they survive a restart) ---------- */

function scheduleReminder(text: string, dueAt: number, id: number): void {
  window.setTimeout(
    () => {
      void completeReminder(id);
      play("reward");
      react({ anim: "happy", text: `⏰ Recordatorio: ${text}` });
    },
    Math.max(0, dueAt - Date.now()),
  );
}

async function createReminder(text: string, dueAt: number): Promise<void> {
  const id = await addReminder(text, dueAt);
  scheduleReminder(text, dueAt, id ?? -1);
}

/** Re-arm everything still pending from the previous session. */
async function restoreReminders(): Promise<void> {
  const rows = await pendingReminders();
  for (const r of rows ?? []) scheduleReminder(r.text, r.due_at, r.id);
}

async function handleUserMessage(msg: string): Promise<void> {
  // manual reminder: "recordar <texto> en <n> min" (n: dígito o palabra)
  const rem =
    /^(?:recordar|recuerda|recordame|recuerdame|record[aá]me|recu[eé]rdame)\s+(.+?)\s+en\s+(\d+|un|uno|una|dos|tres|cuatro|cinco)\s*(?:min(?:uto)?s?)?\b/i.exec(
      msg,
    );
  if (rem) {
    const words: Record<string, number> = {
      un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
    };
    const minutes = /^\d+$/.test(rem[2])
      ? parseInt(rem[2], 10)
      : words[rem[2].toLowerCase()];
    if (minutes && minutes > 0 && minutes <= 240) {
      const reply = `⏰ Te recuerdo "${rem[1]}" en ${minutes} min.`;
      void createReminder(rem[1], Date.now() + minutes * 60_000);
      history.push({ role: "user", content: msg }, { role: "assistant", content: reply });
      void addMessage("user", msg);
      void addMessage("assistant", reply);
      if (history.length > 12) history = history.slice(-12);
      renderChatLog();
      return;
    }
  }
  if (!state) return;
  history.push({ role: "user", content: msg });
  void addMessage("user", msg);
  renderChatLog();
  sprite.setRole("idle");
  const reply = await chat(state, history, msg);
  history.push({ role: "assistant", content: reply });
  void addMessage("assistant", reply);
  if (history.length > 12) history = history.slice(-12);
  sprite.setRole("happy");
  renderChatLog(); // replies land in the transcript, never in a bubble over the pet
}

/* ---------- pet interaction: click vs manual drag ---------- */
// data-tauri-drag-region is NOT used: its native mousedown-drag swallows the
// mouseup, so clicks would never register. We drag only after a 4px threshold.

let downAt: { x: number; y: number; t: number } | null = null;
let dragging = false;

petEl.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  downAt = { x: e.clientX, y: e.clientY, t: Date.now() };
  walker.paused = true;
});

window.addEventListener("mousemove", (e) => {
  if (!downAt || dragging) return;
  if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4) {
    dragging = true;
    downAt = null;
    void getCurrentWindow()
      .startDragging()
      .finally(() => {
        dragging = false;
        if (!panelOpen) walker.paused = false;
      });
  }
});

window.addEventListener("mouseup", (e) => {
  if (downAt) {
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    const quick = Date.now() - downAt.t < 600;
    downAt = null;
    if (moved < 5 && quick && e.button === 0) {
      if (panelOpen) closePanel();
      else openChat();
      walker.paused = panelOpen;
      return;
    }
  }
  if (!panelOpen && !dragging) walker.paused = false;
});

// global: always suppress WebView2's native context menu; open our menu on
// right-click over the pet (or over the open panel)
window.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (petEl.contains(e.target as Node)) {
    if (panelOpen) closePanel();
    else openMenu();
  } else if (panelEl.contains(e.target as Node)) {
    closePanel();
    openMenu();
  }
});

/* ---------- pomodoro ---------- */

const pomodoro = new Pomodoro();
pomodoro.onUpdate = (text) => {
  if (text) {
    badgeEl.textContent = text;
    badgeEl.classList.remove("hidden");
  } else {
    badgeEl.classList.add("hidden");
  }
};
pomodoro.onComplete = (phase) => {
  react(
    phase === "work"
      ? { anim: "happy", text: "🍅 Sesión completada: 25 min de foco. ¡Pausa de 5!" }
      : { anim: "walk", text: "☕ Pausa terminada. ¿Otra ronda de 25?" },
  );
};

/* ---------- walker ---------- */

const walker = new Walker((dir) => sprite.setFacing(dir));

/* ---------- need latch (onset + 90 s re-nag, with the system beep) ---------- */

const NAG_MS = 90_000;

function checkNeeds(force = false): void {
  if (!state) return;
  const got = needsReaction(state);
  if (!got) {
    lastNeedKey = null; // need met: re-arm the onset for the next one
    nextNeedNag = 0;
    return;
  }
  const key = got.reaction.text;
  const onset = lastNeedKey !== key;
  if (!onset && !force && Date.now() < nextNeedNag) return;
  lastNeedKey = key;
  nextNeedNag = Date.now() + NAG_MS;
  react(got.reaction);
  void invoke<boolean>("beep", { urgency: got.urgency }).catch(() => {});
  play(NEED_SOUND[got.urgency] ?? "refuse");
}

/* ---------- save bridge ---------- */

function applySave(raw: string | null): void {
  const next = raw ? parseSave(raw) : null;
  if (!next) {
    if (state) {
      state = null;
      say("No encuentro el save de tuipet...", 5000);
    }
    return;
  }
  const events = diff(state, next);
  state = next;
  sprite.setPet(next.num, next.stage, next.egg_type, next.attribute);
  for (const ev of events) {
    play(EVENT_SOUND[ev]);
    const r = onEvent(ev, next);
    void logEvent(ev, r?.text ?? ""); // the diary reads as the pet's own words
    react(r);
  }
  if (events.length === 0 && Date.now() - lastAmbient > 45_000) {
    const r = ambient(next);
    if (r) {
      lastAmbient = Date.now();
      react(r);
    }
  }
  checkNeeds();
}

/* ---------- boot ---------- */

async function main(): Promise<void> {
  // memory first: it seeds the chat transcript and re-arms pending reminders
  await openDb();
  const saved = await recentMessages(12);
  if (saved && saved.length > 0) {
    history = saved.reverse().map((m) => ({ role: m.role, content: m.content }));
  }
  void restoreReminders();
  void loadDex(); // digibuddy's own Digimon knowledge, warm before the first chat

  try {
    await sprite.load();
  } catch {
    say("No pude cargar los sprites (public/sprites.json).", 8000);
  }

  const [initial, savePath] = await Promise.all([
    invoke<string | null>("read_save"),
    invoke<string>("save_path"),
  ]).catch(() => [null, "(save ilegible)"] as [string | null, string]);
  applySave(initial);

  await listen<string | null>("save-changed", (e) => applySave(e.payload)).catch(
    () => {},
  );

  await walker.start().catch((err) => {
    // never let position errors kill the boot sequence (permission issues etc.)
    say(`Aviso: no puedo pasear (${err})`, 8000);
  });

  // ambient life every 30 s (cooldown enforced in applySave)
  window.setInterval(() => {
    if (state && !panelOpen && Date.now() - lastAmbient > 30_000) {
      const r = ambient(state);
      if (r) {
        lastAmbient = Date.now();
        react(r);
      }
    }
    if (!panelOpen) checkNeeds();
  }, 30_000);

  // greeting
  if (state && state.stage !== "Egg") {
    window.setTimeout(
      () => say(`¡Hola! Soy ${state!.name}. Clic = chat, clic derecho = menú.`),
      800,
    );
  } else if (state) {
    window.setTimeout(() => say("Soy un huevo... ábreme en tuipet."), 800);
  } else {
    window.setTimeout(
      () =>
        say(
          `Esperando tuipet...\nClic derecho = menú → "Abrir tuipet".\n(${savePath})`,
          9000,
        ),
      800,
    );
  }
  play("boot");
}

void main();
