/**
 * Seeded RNG (xorshift32)
 * Deterministic across platforms for simple gameplay uses.
 */
export class RNG {
  private state: number;

  constructor(seed: number) {
    // Ensure non-zero seed
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  public nextUint(): number {
    // xorshift32
    let x = this.state >>> 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  public float01(): number {
    return (this.nextUint() >>> 0) / 0xffffffff;
  }

  public range(min: number, max: number): number {
    return min + (max - min) * this.float01();
  }
}
