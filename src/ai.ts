// AI layer: routes chat through Rust (no CORS) to local Ollama, falls back to rules.
import { invoke } from "@tauri-apps/api/core";
import { moodWord, PetState } from "./save";
import { ruleReply } from "./reactions";
import { play } from "./sound";
import { load as loadDex, localAnswer, selfDossier } from "./digipedia";

const MODEL = localStorage.getItem("digibuddy.model") || "dolphin-phi";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

function systemPrompt(s: PetState): string {
  return [
    `Eres ${s.name}, un Digimon de etapa ${s.stage} (atributo ${s.attribute}, generación ${s.generation}).`,
    `Estás en modo mascota de escritorio y hablas español.`,
    `Tu estado actual: ${moodWord(s)}, fuerza ${s.strength}, energía ${s.energy}/${s.max_energy}, hambre ${s.hunger}/4, bits ${s.bits}, victorias ${s.wins}.`,
    selfDossier(s),
    `Responde en máximo 2 frases, sin markdown ni listas, en tono propio de ${s.name}.`,
    `Si te preguntan por tuipet, explica que solo lees su save (solo lectura) y que acciones como comer, dormir o jugar pasan allí.`,
    `Menciona de vez en cuando que © Bandai es el dueño original y que esto es fan-art no comercial, si te lo preguntan.`,
  ].filter(Boolean).join(" ");
}

export async function chat(
  state: PetState,
  history: ChatTurn[],
  userMsg: string,
): Promise<string> {
  await loadDex(); // the dossier is grounded in digidex.json — load before asking
  // Hard facts about HIMSELF (what a Digimon is, the stages, his own line)
  // are answered from digidex, never by the model: dolphin-phi reads the
  // dossier fine but still invents evolution names for "¿en qué te vas a
  // evolucionar?" (A/B 2026-10-01).  The LLM keeps every open question.
  const grounded = localAnswer(state, userMsg);
  if (grounded) return grounded;
  const messages = [
    { role: "system", content: systemPrompt(state) },
    ...history.slice(-6),
    { role: "user", content: userMsg },
  ];
  try {
    const out = await invoke<string>("ollama_chat", {
      payload: JSON.stringify({
        model: MODEL,
        messages,
        stream: false, // Ollama defaults to NDJSON streaming; Rust reads one JSON body
        options: { temperature: 0.9 },
      }),
    });
    const text = out.trim();
    if (!text) throw new Error("vacío");
    return text;
  } catch {
    play("error"); // Ollama unreachable: local knowledge first, then the rules
    return localAnswer(state, userMsg) ?? ruleReply(state, userMsg);
  }
}
