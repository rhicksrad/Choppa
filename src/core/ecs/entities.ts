export type Entity = number;

/**
 * Minimal entity allocator using a free list. Avoids per-frame allocations.
 */
export class EntityRegistry {
  private nextId: Entity = 1;
  private freeList: Entity[] = [];

  public create(): Entity {
    const id = this.freeList.pop();
    if (id !== undefined) return id;
    const newId = this.nextId;
    this.nextId += 1;
    return newId;
  }

  public destroy(id: Entity): void {
    this.freeList.push(id);
  }
}
