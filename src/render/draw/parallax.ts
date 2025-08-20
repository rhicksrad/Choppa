export class ParallaxSky {
  private stars: { x: number; y: number; r: number; a: number }[] = [];
  private initialized = false;

  public init(width: number, height: number, seed = 12345): void {
    if (this.initialized) return;
    this.initialized = true;
    const count = Math.floor((width * height) / 16000);
    let s = seed >>> 0;
    const rand = (): number => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 0xffffffff;
    };
    this.stars.length = 0;
    for (let i = 0; i < count; i += 1) {
      this.stars.push({ x: rand() * width, y: rand() * height, r: rand() * 1.5 + 0.5, a: 0.4 });
    }
  }

  public render(context: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const w = context.canvas.width;
    const h = context.canvas.height;
    this.init(w, h);
    context.save();
    context.fillStyle = '#0b0d10';
    context.fillRect(0, 0, w, h);
    context.globalAlpha = 0.8;
    context.fillStyle = '#9fb3c8';
    for (let i = 0; i < this.stars.length; i += 1) {
      const s = this.stars[i]!;
      const px = (s.x - cameraX * 0.05) % w;
      const py = (s.y - cameraY * 0.02) % h;
      context.beginPath();
      context.arc(px < 0 ? px + w : px, py < 0 ? py + h : py, s.r, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}
