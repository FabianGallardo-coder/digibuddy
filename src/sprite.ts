// Renders tuipet's 1-bit frames (rows of '0'/'1') onto a pixelated canvas.
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

// attribute → color, so the silhouette is readable on any wallpaper
const ATTR_COLORS: Record<string, string> = {
  Vaccine: "#37b24d",
  Data: "#4dabf7",
  Virus: "#b06ae0",
  None: "#f76707",
};

export class SpriteRenderer {
  private data: SpriteData | null = null;
  private frames: string[] = [];
  private roles: Record<string, number[]> = {};
  private role = "idle";
  private timer = 0;
  private w = 16;
  private h = 16;
  private color = "#f76707";
  private facing = 1;

  constructor(private canvas: HTMLCanvasElement) {}

  async load(): Promise<void> {
    const res = await fetch("/sprites.json");
    this.data = (await res.json()) as SpriteData;
    this.roles = this.data.roles;
  }

  setPet(num: number, stage: string, eggType: number, attribute: string): void {
    if (!this.data) return;
    if (stage === "Egg" || num < 0) {
      const egg = this.data.eggs[eggType % this.data.eggs.length];
      if (!egg || egg.length === 0) return;
      this.frames = egg;
      this.w = 16;
      this.h = 16;
      this.color = "#f76707";
      this.setRole("idle"); // egg.ROLES.idle = [0, 1] == data.ROLES.idle
      return;
    }
    const rec = this.data.mons[String(num)];
    if (!rec) return;
    this.frames = rec.frames;
    this.w = rec.w;
    this.h = rec.h;
    this.color =
      ATTR_COLORS[attribute] ?? ATTR_COLORS[rec.attribute] ?? "#f76707";
    this.setRole(this.role);
  }

  setRole(role: string): void {
    if (!(role in this.roles)) role = "idle";
    const seq = this.roles[role] ?? [0];
    if (role === this.role && this.timer !== 0) {
      this.draw(seq[0]);
      return;
    }
    this.role = role;
    const fast = role === "walk" || role === "eat" || role === "hatch";
    const fps = fast ? 8 : 5;
    clearInterval(this.timer);
    let i = 0;
    this.draw(seq[0]);
    this.timer = setInterval(() => {
      i = (i + 1) % seq.length;
      this.draw(seq[i]);
    }, 1000 / fps);
  }

  setFacing(dir: 1 | -1): void {
    if (dir !== this.facing) {
      this.facing = dir;
      this.canvas.style.transform = dir === -1 ? "scaleX(-1)" : "";
    }
  }

  private draw(idx: number): void {
    const fr = this.frames[idx] ?? this.frames[0];
    if (!fr) return;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = this.color;
    for (let i = 0; i < fr.length; i++) {
      if (fr[i] === "1") ctx.fillRect(i % this.w, Math.floor(i / this.w), 1, 1);
    }
  }
}
