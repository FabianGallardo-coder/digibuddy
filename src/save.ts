// Read-only view of tuipet's save.json + diffing for reaction events.
export interface PetState {
  num: number;
  name: string;
  stage: string;
  attribute: string;
  egg_type: number;
  hunger: number;
  strength: number;
  energy: number;
  max_energy: number;
  poop: number;
  asleep: boolean;
  lights: boolean;
  sick: boolean;
  injured: boolean;
  depressed: boolean;
  obedience: number;
  wins: number;
  bits: number;
  generation: number;
  dead: boolean;
  anim: string;
  care_mistakes: number;
  discipline_call: string;
}

export type SaveEvent =
  | "hatched"
  | "evolved"
  | "egg"
  | "win"
  | "death"
  | "cured";

export function parseSave(raw: string): PetState | null {
  try {
    const d = JSON.parse(raw) as Record<string, unknown>;
    if (typeof d.num !== "number" || typeof d.name !== "string") return null;
    return {
      num: d.num,
      name: d.name,
      stage: (d.stage as string) ?? "Rookie",
      attribute: (d.attribute as string) ?? "None",
      egg_type: (d.egg_type as number) ?? 0,
      hunger: (d.hunger as number) ?? 2,
      strength: (d.strength as number) ?? 2,
      energy: (d.energy as number) ?? 2,
      max_energy: (d.max_energy as number) ?? 4,
      poop: (d.poop as number) ?? 0,
      asleep: Boolean(d.asleep),
      lights: Boolean(d.lights),
      sick: Boolean(d.sick),
      injured: Boolean(d.injured),
      depressed: Boolean(d.depressed),
      obedience: (d.obedience as number) ?? 0,
      wins: (d.wins as number) ?? 0,
      bits: (d.bits as number) ?? 0,
      generation: (d.generation as number) ?? 1,
      dead: Boolean(d.dead),
      anim: (d.anim as string) ?? "idle",
      care_mistakes: (d.care_mistakes as number) ?? 0,
      discipline_call: (d.discipline_call as string) ?? "",
    };
  } catch {
    return null;
  }
}

// Port of Pet.is_frail(): an Ultimate/Mega carrying 3+ care mistakes is one
// mistake away from the elder-death cap. The game's only lethal-adjacent class.
export function isFrail(s: PetState): boolean {
  return (s.stage === "Ultimate" || s.stage === "Mega") && s.care_mistakes >= 3;
}

export interface Need {
  key: string; // the cure key in tuipet ("" = no key cures it)
  urgency: 1 | 2 | 3; // app._alarm_urgency: 3 urgent, 2 mess, 1 routine
  text: string;
}

// Port of app._need_message(): the most urgent unmet need, naming the key that
// cures it. Precedence is the game's own.
export function need(s: PetState): Need | null {
  if (s.dead || s.stage === "Egg") return null;
  if (s.asleep && s.lights)
    return { key: "O", urgency: 1, text: `¿Luz encendida? Apágala y duermo (O).` };
  if (s.sick)
    return { key: "F", urgency: 3, text: `¡Me siento mal! Necesito la píldora (F).` };
  if (s.injured) return { key: "H", urgency: 3, text: `¡Estoy herido! Vendame (H).` };
  if (s.hunger === 0)
    return { key: "F", urgency: 1, text: `¡Se me cae el estómago! Dame de comer (F).` };
  if (s.strength === 0)
    return { key: "T", urgency: 3, text: `Mi fuerza está a cero. Entréname (T).` };
  if (s.poop >= 3)
    return { key: "C", urgency: 2, text: `Huele fatal por aquí... ¡Límpiame! (C).` };
  if (s.energy <= 0 && !s.asleep)
    return { key: "O", urgency: 3, text: `No puedo más... necesito descansar (O).` };
  if (s.discipline_call)
    return { key: "P", urgency: 1, text: `¡Estoy portándome mal! Repréndeme (P).` };
  if (isFrail(s))
    return {
      key: "",
      urgency: 3,
      text: `Me estoy debilitando: llevo ${s.care_mistakes} descuidos. Cuídame bien.`,
    };
  return null;
}

export function diff(prev: PetState | null, next: PetState): SaveEvent[] {
  if (!prev) return [];
  const ev: SaveEvent[] = [];
  if (next.dead && !prev.dead) ev.push("death");
  if (prev.stage !== next.stage) {
    ev.push(next.stage === "Egg" ? "egg" : prev.stage === "Egg" ? "hatched" : "evolved");
  } else if (prev.num !== next.num && next.stage !== "Egg") {
    ev.push("evolved");
  }
  if (next.wins > prev.wins) ev.push("win");
  if (prev.sick && !next.sick) ev.push("cured");
  return ev;
}

export function moodWord(s: PetState): string {
  if (s.dead) return "Fallecido";
  if (s.stage === "Egg") return "Huevo";
  if (s.asleep) return s.lights ? "Doliendo la luz" : "Durmiendo";
  if (s.sick) return "Enfermo";
  if (s.injured) return "Herido";
  if (s.hunger === 0) return "Muerto de hambre";
  if (s.poop >= 3) return "Sucio";
  if (s.energy <= 0) return "Agotado";
  if (s.hunger >= 3 && s.strength >= 3) return "Feliz";
  return "Normal";
}
