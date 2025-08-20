export interface DebugStats {
  fps: number;
  dt: number;
  entities: number;
}

export class DebugOverlay {
  private enabled = false;
  private fpsSmoothing = 0.9;
  private smoothedFps = 0;

  public toggle(): void {
    this.enabled = !this.enabled;
  }

  public setEnabled(value: boolean): void {
    this.enabled = value;
  }

  public render(context: CanvasRenderingContext2D, stats: DebugStats): void {
    if (!this.enabled) return;
    const lines = [
      `fps: ${stats.fps.toFixed(0)}`,
      `dt: ${(stats.dt * 1000).toFixed(2)} ms`,
      `entities: ${stats.entities}`,
    ];
    context.save();
    context.globalAlpha = 0.85;
    context.fillStyle = '#001b2e';
    context.fillRect(8, 8, 160, 58);
    context.globalAlpha = 1;
    context.fillStyle = '#c8d7e1';
    context.font = '12px system-ui, sans-serif';
    for (let i = 0; i < lines.length; i += 1) {
      context.fillText(lines[i]!, 14, 24 + i * 14);
    }
    context.restore();
  }
}
