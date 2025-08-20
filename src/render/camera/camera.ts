export interface CameraOptions {
  x?: number;
  y?: number;
  deadzoneWidth?: number;
  deadzoneHeight?: number;
  lerp?: number; // smoothing factor 0..1
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
}

export class Camera2D {
  public x: number;
  public y: number;
  public deadzoneWidth: number;
  public deadzoneHeight: number;
  public lerp: number;
  public bounds?: { minX: number; minY: number; maxX: number; maxY: number };

  constructor(options?: CameraOptions) {
    this.x = options?.x ?? 0;
    this.y = options?.y ?? 0;
    this.deadzoneWidth = options?.deadzoneWidth ?? 64;
    this.deadzoneHeight = options?.deadzoneHeight ?? 48;
    this.lerp = options?.lerp ?? 0.1;
    this.bounds = options?.bounds;
  }

  public follow(targetX: number, targetY: number, viewW: number, viewH: number): void {
    const dzLeft = this.x - this.deadzoneWidth / 2;
    const dzRight = this.x + this.deadzoneWidth / 2;
    const dzTop = this.y - this.deadzoneHeight / 2;
    const dzBottom = this.y + this.deadzoneHeight / 2;

    let desiredX = this.x;
    let desiredY = this.y;

    if (targetX < dzLeft) desiredX = targetX + this.deadzoneWidth / 2;
    else if (targetX > dzRight) desiredX = targetX - this.deadzoneWidth / 2;
    if (targetY < dzTop) desiredY = targetY + this.deadzoneHeight / 2;
    else if (targetY > dzBottom) desiredY = targetY - this.deadzoneHeight / 2;

    // Smooth
    this.x += (desiredX - this.x) * this.lerp;
    this.y += (desiredY - this.y) * this.lerp;

    // Clamp to bounds (consider view size)
    if (this.bounds) {
      const minX = this.bounds.minX + viewW / 2;
      const maxX = this.bounds.maxX - viewW / 2;
      const minY = this.bounds.minY + viewH / 2;
      const maxY = this.bounds.maxY - viewH / 2;
      this.x = Math.max(minX, Math.min(maxX, this.x));
      this.y = Math.max(minY, Math.min(maxY, this.y));
    }
  }
}
