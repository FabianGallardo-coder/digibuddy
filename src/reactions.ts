// Rule layer: reacts to save events and ambient state — works with Ollama off.
import { moodWord, need, PetState, SaveEvent } from "./save";

export interface Reaction {
  anim: string;
  text: string;
}

export function onEvent(ev: SaveEvent, s: PetState): Reaction | null {
  switch (ev) {
    case "evolved":
      return { anim: "happy", text: `¡${s.name} digivolucionó a ${s.stage}!` };
    case "hatched":
      return { anim: "happy", text: `¡¡${s.name} ha eclosionado!!` };
    case "egg":
      return { anim: "idle", text: "Un huevo... cosquillas ahí dentro." };
    case "win":
      return { anim: "happy", text: `¡Victoria! Van ${s.wins} en esta etapa.` };
    case "death":
      return { anim: "sad", text: `${s.name} ha descansado. Pulsa N en tuipet para un nuevo huevo.` };
    case "cured":
      return { anim: "happy", text: "¡Ya estoy mejor!" };
  }
  return null;
}

// The unmet-care call, mirroring the game's own need classes. main.ts holds
// the latch (onset + 90 s re-nag) and pairs this with the system beep.
export function needsReaction(s: PetState): { reaction: Reaction; urgency: 1 | 2 | 3 } | null {
  const n = need(s);
  if (!n) return null;
  const anim =
    n.urgency === 3 ? "tired" : n.key === "C" ? "sad" : n.key === "O" ? "exhausted" : "angry";
  return { reaction: { anim, text: n.text }, urgency: n.urgency };
}

// Called periodically; main.ts enforces a cooldown so it never spams.
// Returns null whenever a real need is pending — that case belongs to
// needsReaction(), so the two never fight over the same bubble.
export function ambient(s: PetState): Reaction | null {
  if (s.dead) return { anim: "sleep", text: "..." };
  if (s.stage === "Egg") return null;
  if (need(s)) return null;
  if (s.asleep) return { anim: "sleep", text: "Zzz..." };
  return null;
}

// Offline fallback when Ollama is unreachable.
export function ruleReply(s: PetState, msg: string): string {
  const m = msg.toLowerCase();
  if (/(hambre|comer|comida|manzan)/.test(m))
    return s.hunger <= 1
      ? "¡Hambre máxima! Ábreme en tuipet y dame de comer."
      : "Ahora no tengo hambre, gracias (hunger " + s.hunger + "/4).";
  if (/(cómo estas|como estas|estado|que tal)/.test(m)) {
    if (s.dead) return "Descanso en paz... dime algo bonito.";
    return `${s.name}, ${s.stage} — ${moodWord(s)}. Fuerza ${s.strength}, energía ${s.energy}/${s.max_energy}, bits ${s.bits}.`;
  }
  if (/(hora|fecha|qué hora|que hora)/.test(m)) {
    const d = new Date();
    return `Son las ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.`;
  }
  if (/(quién eres|quien eres|tu nombre|te llamas)/.test(m))
    return `Soy ${s.name} (${s.stage}, gen. ${s.generation}). Vivo en tuipet y te miro escribir. 😌`;
  if (/(pelea|batalla|combate|luchar)/.test(m))
    return `He ganado ${s.wins} batallas. Enfréntame en tuipet para más.`;
  return `(${moodWord(s)}) Ollama está off — respondo con reglas. Escribe "estado" y lo verás.`;
}
