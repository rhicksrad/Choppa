export interface FogHole {
  x: number; // screen-space px
  y: number; // screen-space px
  radius: number; // px
  softness: number; // 0..1 (inner hard-clear radius fraction)
}

/**
 * Fog of War overlay. Draws a dark layer and cuts soft holes where visible.
 * Uses an offscreen canvas to avoid compositing artifacts.
 */
export class FogOfWar {
  private overlay: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private alpha: number;

  constructor(alpha = 0.88) {
    this.overlay = document.createElement('canvas');
    const ctx = this.overlay.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable for FogOfWar');
    this.ctx = ctx;
    this.alpha = alpha;
  }

  public resize(width: number, height: number): void {
    if (this.overlay.width !== width || this.overlay.height !== height) {
      this.overlay.width = width;
      this.overlay.height = height;
    }
  }

  public render(main: CanvasRenderingContext2D, holes: FogHole[]): void {
    const w = this.overlay.width;
    const h = this.overlay.height;
    const ctx = this.ctx;

    // Fill with dark overlay
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0,0,0,${this.alpha})`;
    ctx.fillRect(0, 0, w, h);

    // Carve holes
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < holes.length; i += 1) {
      const hole = holes[i]!;
      const inner = Math.max(0, Math.min(1, hole.softness)) * hole.radius;
      const grad = ctx.createRadialGradient(hole.x, hole.y, inner, hole.x, hole.y, hole.radius);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      // Draw a rect covering the gradient bounds (faster than path with large radius)
      const x = hole.x - hole.radius;
      const y = hole.y - hole.radius;
      const d = hole.radius * 2;
      ctx.fillRect(x, y, d, d);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Blit overlay onto main
    main.drawImage(this.overlay, 0, 0);
  }
}
