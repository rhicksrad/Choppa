import type { System } from '../../core/ecs/systems';
import type { ComponentStore } from '../../core/ecs/components';
import type { Health } from '../components/Health';
import type { Transform } from '../components/Transform';
import type { Collider } from '../components/Collider';
import type { Entity } from '../../core/ecs/entities';

export interface PendingHit {
  x: number; // tile-space
  y: number;
  radius: number;
  amount: number;
}

export class DamageSystem implements System {
  private hits: PendingHit[] = [];
  private deadQueue: Entity[] = [];
  private deadSet: Set<Entity> = new Set();
  private modifyDamage: ((entity: Entity, amount: number) => number) | null = null;
  constructor(
    private transforms: ComponentStore<Transform>,
    private colliders: ComponentStore<Collider>,
    private healths: ComponentStore<Health>,
  ) {}

  public queue(hit: PendingHit): void {
    this.hits.push(hit);
  }

  public setDamageModifier(modifier: (entity: Entity, amount: number) => number): void {
    this.modifyDamage = modifier;
  }

  public applyDirect(entity: Entity, amount: number): void {
    const health = this.healths.get(entity);
    if (!health) return;
    let finalAmount = amount;
    if (this.modifyDamage) finalAmount = this.modifyDamage(entity, finalAmount);
    if (!Number.isFinite(finalAmount) || finalAmount <= 0) return;
    health.current = Math.max(0, health.current - finalAmount);
    if (health.current <= 0) this.markDead(entity);
  }

  update(): void {
    if (this.hits.length === 0) return;
    for (let i = 0; i < this.hits.length; i += 1) {
      const hit = this.hits[i]!;
      this.colliders.forEach((e, c) => {
        const t = this.transforms.get(e);
        const h = this.healths.get(e);
        if (!t || !h || h.current <= 0) return;
        const r = (c.radius || 0) + hit.radius;
        const dx = t.tx - hit.x;
        const dy = t.ty - hit.y;
        if (dx * dx + dy * dy <= r * r) {
          let amount = hit.amount;
          if (this.modifyDamage) amount = this.modifyDamage(e, amount);
          if (!Number.isFinite(amount) || amount <= 0) return;
          h.current = Math.max(0, h.current - amount);
          if (h.current <= 0) this.markDead(e);
        }
      });
    }
    this.hits.length = 0;
  }

  public reset(): void {
    this.hits.length = 0;
    this.deadQueue.length = 0;
    this.deadSet.clear();
  }

  public consumeDeaths(): Entity[] {
    if (this.deadQueue.length === 0) return [];
    const out = this.deadQueue.slice();
    this.deadQueue.length = 0;
    this.deadSet.clear();
    return out;
  }

  private markDead(entity: Entity): void {
    if (this.deadSet.has(entity)) return;
    this.deadSet.add(entity);
    this.deadQueue.push(entity);
  }
}
