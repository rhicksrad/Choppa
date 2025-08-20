import type { Entity } from './entities';

/**
 * Dense component store keyed by entity id. Uses parallel arrays for tight loops.
 */
export class ComponentStore<T> {
  private values: (T | undefined)[] = [];
  private entities: Entity[] = [];
  private indices: number[] = []; // entity -> dense index

  public has(entity: Entity): boolean {
    return this.indices[entity] !== undefined;
  }

  public get(entity: Entity): T | undefined {
    const idx = this.indices[entity];
    return idx !== undefined ? this.values[idx] : undefined;
  }

  public set(entity: Entity, value: T): void {
    const idx = this.indices[entity];
    if (idx !== undefined) {
      this.values[idx] = value;
      this.entities[idx] = entity;
      return;
    }
    const newIndex = this.values.length;
    this.values.push(value);
    this.entities.push(entity);
    this.indices[entity] = newIndex;
  }

  public remove(entity: Entity): void {
    const idx = this.indices[entity];
    if (idx === undefined) return;

    const lastIndex = this.values.length - 1;
    if (idx !== lastIndex) {
      // swap remove
      this.values[idx] = this.values[lastIndex];
      this.entities[idx] = this.entities[lastIndex];
      const movedEntity = this.entities[idx];
      this.indices[movedEntity] = idx;
    }
    this.values.pop();
    this.entities.pop();
    this.indices[entity] = undefined as unknown as number;
  }

  public forEach(callback: (entity: Entity, value: T) => void): void {
    for (let i = 0; i < this.values.length; i += 1) {
      const value = this.values[i] as T;
      const entity = this.entities[i];
      callback(entity, value);
    }
  }
}
