// Event WAVs — the 35 files under public/sounds are byte-identical copies of
// tuipet's data/sounds, so digibuddy shares the game's own audio identity.
// Playback is plain HTMLAudioElement inside the WebView: no Rust, no plugin.
// Every call is fire-and-forget — autoplay policy or a missing file must never
// break the UI.

const VOLUME_KEY = "digibuddy.volume";
const DEFAULT_VOLUME = 0.8;

function readVolume(): number {
  const raw = localStorage.getItem(VOLUME_KEY);
  if (raw === null) return DEFAULT_VOLUME;
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : DEFAULT_VOLUME;
}

let volume = readVolume();

export function getVolume(): number {
  return volume;
}

export function setVolume(v: number): void {
  volume = Math.min(1, Math.max(0, v));
  localStorage.setItem(VOLUME_KEY, String(volume));
}

export function play(name: string): void {
  if (volume <= 0) return;
  try {
    const a = new Audio(`/sounds/${name}.wav`);
    a.volume = volume;
    void a.play().catch(() => {});
  } catch {
    // no audio device / unknown file: stay silent
  }
}
