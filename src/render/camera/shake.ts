export class CameraShake {
  private t = 0;
  private duration = 0;
  private magnitude = 0;

  public trigger(magnitude: number, duration: number): void {
    this.magnitude = Math.max(this.magnitude, magnitude);
    this.duration = Math.max(this.duration, duration);
    this.t = 0;
  }

  public offset(dt: number): { x: number; y: number } {
    if (this.t >= this.duration || this.duration <= 0) return { x: 0, y: 0 };
    this.t += dt;
    const p = 1 - this.t / this.duration;
    const k = this.magnitude * p * p;
    return {
      x: (Math.random() * 2 - 1) * k,
      y: (Math.random() * 2 - 1) * k,
    };
  }
}
