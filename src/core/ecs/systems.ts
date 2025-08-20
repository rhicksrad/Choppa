export interface System {
  update(dt: number): void;
}

export class SystemScheduler {
  private systems: System[] = [];

  public add(system: System): void {
    this.systems.push(system);
  }

  public update(dt: number): void {
    // Straight for-loop to allow V8 inlining; avoid forEach allocs
    const local = this.systems;
    for (let i = 0; i < local.length; i += 1) {
      local[i].update(dt);
    }
  }
}
