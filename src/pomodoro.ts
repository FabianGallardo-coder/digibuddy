// Pomodoro: 25 min focus / 5 min break, running inside the pet's badge.
export type Phase = "work" | "break";

const WORK = 25 * 60;
const BREAK = 5 * 60;

export class Pomodoro {
  running = false;
  phase: Phase = "work";
  remaining = WORK;
  private timer = 0;
  onUpdate: (badge: string | null) => void = () => {};
  onComplete: (phase: Phase) => void = () => {};

  get badge(): string | null {
    if (!this.running) return null;
    const m = Math.floor(this.remaining / 60);
    const s = this.remaining % 60;
    return `${this.phase === "work" ? "🍅" : "☕"} ${m}:${String(s).padStart(2, "0")}`;
  }

  toggle(): void {
    this.running = !this.running;
    clearInterval(this.timer);
    if (this.running) {
      this.timer = window.setInterval(() => this.tick(), 1000);
    }
    this.emit();
  }

  reset(): void {
    this.running = false;
    clearInterval(this.timer);
    this.phase = "work";
    this.remaining = WORK;
    this.emit();
  }

  private tick(): void {
    this.remaining--;
    if (this.remaining <= 0) {
      const done = this.phase;
      this.phase = done === "work" ? "break" : "work";
      this.remaining = this.phase === "work" ? WORK : BREAK;
      this.onComplete(done);
    }
    this.emit();
  }

  private emit(): void {
    this.onUpdate(this.badge);
  }
}
