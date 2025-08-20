export type UpdateCallback = (fixedDeltaSeconds: number) => void;
export type RenderCallback = (alpha: number) => void;

/**
 * Deterministic fixed-timestep game loop with interpolated rendering.
 * - Update runs at fixed 60 Hz (configurable via constructor step).
 * - Rendering is decoupled from updates.
 * - Accumulator is clamped to avoid spiral of death.
 */
export class GameLoop {
  private readonly stepSeconds: number;
  private readonly maxAccumulatedSeconds: number;
  private update: UpdateCallback;
  private render: RenderCallback;
  private running = false;
  private lastTimeMs = 0;
  private accumulatorSeconds = 0;

  constructor(options: {
    stepSeconds?: number;
    maxAccumulatedSeconds?: number;
    update: UpdateCallback;
    render: RenderCallback;
  }) {
    this.stepSeconds = options.stepSeconds ?? 1 / 60;
    this.maxAccumulatedSeconds = options.maxAccumulatedSeconds ?? 0.25; // clamp ~15 frames
    this.update = options.update;
    this.render = options.render;
  }

  public setCallbacks(update: UpdateCallback, render: RenderCallback): void {
    this.update = update;
    this.render = render;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimeMs = performance.now();
    this.accumulatorSeconds = 0;
    requestAnimationFrame(this.frame);
  }

  public stop(): void {
    this.running = false;
  }

  private frame = (nowMs: number): void => {
    if (!this.running) return;

    // Timekeeping
    const deltaSeconds = Math.min((nowMs - this.lastTimeMs) / 1000, this.maxAccumulatedSeconds);
    this.lastTimeMs = nowMs;
    this.accumulatorSeconds += deltaSeconds;

    // Fixed updates
    while (this.accumulatorSeconds >= this.stepSeconds) {
      this.update(this.stepSeconds);
      this.accumulatorSeconds -= this.stepSeconds;
    }

    // Interpolated render
    const alpha = this.accumulatorSeconds / this.stepSeconds;
    this.render(alpha);

    requestAnimationFrame(this.frame);
  };
}
