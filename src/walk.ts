// Autonomous walking: wanders the monitor's work area in small steps.
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalPosition } from "@tauri-apps/api/dpi";

const WIN_W = 210;
const WIN_H = 270;
const STEP = 6;
const STEP_MS = 55;

export class Walker {
  enabled = true;
  paused = false; // true while dragging or a panel is open
  private x = 0;
  private y = 0;
  private tx = 0;
  private ty = 0;
  private timer = 0;
  private moving = false;
  private onFacing: (dir: 1 | -1) => void;

  constructor(onFacing: (dir: 1 | -1) => void) {
    this.onFacing = onFacing;
  }

  async start(): Promise<void> {
    const monitor = await currentMonitor();
    const scale = monitor?.scaleFactor ?? 1;
    const area = monitor
      ? {
          left: monitor.workArea.position.x / scale,
          top: monitor.workArea.position.y / scale,
          width: monitor.workArea.size.width / scale,
          height: monitor.workArea.size.height / scale,
        }
      : { left: 0, top: 0, width: 1920, height: 1080 };

    this.x = area.left + area.width - WIN_W - 40;
    this.y = this.floorY(area);
    this.tx = this.x;
    this.ty = this.y;
    await getCurrentWindow().setPosition(new LogicalPosition(this.x, this.y));
    this.schedule(area, 1500);
  }

  // bias to the lower half: pets walk on the "floor"
  private floorY(a: { top: number; height: number }): number {
    const maxY = a.top + a.height - WIN_H - 8;
    const minY = a.top + a.height * 0.55;
    return Math.min(maxY, Math.max(minY, minY + Math.random() * (maxY - minY)));
  }

  private schedule(a: Record<string, number>, ms: number): void {
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.tick(a), ms);
  }

  private async tick(a: Record<string, number>): Promise<void> {
    if (!this.enabled || this.paused) {
      this.schedule(a, 2000);
      return;
    }
    if (!this.moving) {
      // pick a new destination in the floor band
      const minX = a.left + 8;
      const maxX = a.left + a.width - WIN_W - 8;
      this.tx = minX + Math.random() * Math.max(1, maxX - minX);
      this.ty = this.floorY(a as never);
    }
    await this.step(a);
  }

  private async step(a: Record<string, number>): Promise<void> {
    if (!this.enabled || this.paused) {
      this.moving = false;
      this.schedule(a, 2000);
      return;
    }
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    if (Math.abs(dx) < STEP && Math.abs(dy) < STEP) {
      this.moving = false;
      this.schedule(a, 2000 + Math.random() * 7000);
      return;
    }
    this.moving = true;
    this.x += Math.sign(dx) * Math.min(STEP, Math.abs(dx));
    this.y += Math.sign(dy) * Math.min(STEP, Math.abs(dy));
    if (Math.abs(dx) >= STEP) this.onFacing(dx > 0 ? 1 : -1);
    try {
      await getCurrentWindow().setPosition(new LogicalPosition(this.x, this.y));
    } catch {
      this.moving = false;
      this.schedule(a, 5000);
      return;
    }
    this.schedule(a, STEP_MS);
  }

  stop(): void {
    clearTimeout(this.timer);
  }
}
