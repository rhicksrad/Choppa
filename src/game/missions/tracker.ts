import type { MissionState, ObjectiveState } from './types';
import type { ComponentStore } from '../../core/ecs/components';
import type { Transform } from '../components/Transform';
import type { Collider } from '../components/Collider';
import type { Health } from '../components/Health';

export class MissionTracker {
  constructor(
    public state: MissionState,
    private transforms: ComponentStore<Transform>,
    private colliders: ComponentStore<Collider>,
    private healths: ComponentStore<Health>,
    private getPlayer: () => { tx: number; ty: number },
    private overrides: Record<string, () => boolean> = {},
  ) {}

  public update(): void {
    // Evaluate each objective
    for (let i = 0; i < this.state.objectives.length; i += 1) {
      const o = this.state.objectives[i]!;
      if (o.complete) continue;
      const override = this.overrides[o.id];
      if (override) {
        if (override()) o.complete = true;
        continue;
      }
      if (!this.prerequisitesMet(o)) {
        continue;
      }
      if (o.type === 'reach') {
        const p = this.getPlayer();
        if (tileDist(p.tx, p.ty, o.at.tx, o.at.ty) <= o.radiusTiles) {
          o.complete = true;
        }
      } else if (o.type === 'destroy') {
        // Consider objective complete if no living collider within radius
        let anyAlive = false;
        this.colliders.forEach((e, _c) => {
          if (anyAlive) return;
          const t = this.transforms.get(e);
          if (!t) return;
          const h = this.healths.get(e);
          if (!h || h.current <= 0) return;
          if (tileDist(t.tx, t.ty, o.at.tx, o.at.ty) <= o.radiusTiles) anyAlive = true;
        });
        if (!anyAlive) o.complete = true;
      }
    }
    this.state.complete = this.state.objectives.every((o) => o.complete);
  }

  public nextIncomplete(): ObjectiveState | undefined {
    return this.state.objectives.find((o) => !o.complete);
  }

  private prerequisitesMet(o: ObjectiveState): boolean {
    if (!o.requires || o.requires.length === 0) {
      return true;
    }
    return o.requires.every((id) =>
      this.state.objectives.some((candidate) => candidate.id === id && candidate.complete),
    );
  }
}

function tileDist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}
