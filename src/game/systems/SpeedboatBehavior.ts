import type { System } from '../../core/ecs/systems';
import type { ComponentStore } from '../../core/ecs/components';
import type { Transform } from '../components/Transform';
import type { Physics } from '../components/Physics';
import type { Speedboat } from '../components/Speedboat';
import type { FireEvent } from './WeaponFire';
import type { Entity } from '../../core/ecs/entities';
import { RNG } from '../../core/util/rng';

export class SpeedboatBehaviorSystem implements System {
  constructor(
    private transforms: ComponentStore<Transform>,
    private physics: ComponentStore<Physics>,
    private speedboats: ComponentStore<Speedboat>,
    private fireEvents: FireEvent[],
    private rng: RNG,
    private getPlayer: () => { x: number; y: number },
    private onReachTarget: (entity: Entity) => void,
  ) {}

  update(dt: number): void {
    const player = this.getPlayer();
    const landed: Entity[] = [];
    const squadAlerted = new Map<string, boolean>();

    this.speedboats.forEach((entity, boat) => {
      if (boat.squadId && boat.activated) {
        squadAlerted.set(boat.squadId, true);
      }
    });

    this.speedboats.forEach((entity, boat) => {
      const t = this.transforms.get(entity);
      const phys = this.physics.get(entity);
      if (!t || !phys) return;

      const px = player.x - t.tx;
      const py = player.y - t.ty;
      const pDist = Math.hypot(px, py);

      if (!boat.activated) {
        const squadKey = boat.squadId;
        const squadIsAlerted = squadKey ? squadAlerted.get(squadKey) === true : false;
        const shouldActivate = squadKey
          ? squadIsAlerted || pDist <= boat.activationRange
          : pDist <= boat.activationRange;
        if (shouldActivate) {
          boat.activated = true;
          if (squadKey) {
            squadAlerted.set(squadKey, true);
          }
        } else {
          phys.vx = 0;
          phys.vy = 0;
          phys.ax = 0;
          phys.ay = 0;
          boat.cooldown = Math.max(0, boat.cooldown - dt);
          return;
        }
      } else if (boat.squadId && !squadAlerted.get(boat.squadId)) {
        squadAlerted.set(boat.squadId, true);
      }

      const dx = boat.targetX - t.tx;
      const dy = boat.targetY - t.ty;
      const dist = Math.hypot(dx, dy);
      if (dist <= boat.arrivalRadius) {
        landed.push(entity);
        return;
      }

      const clampedDist = dist || 1;
      const desiredVx = (dx / clampedDist) * boat.speed;
      const desiredVy = (dy / clampedDist) * boat.speed;
      phys.ax = (desiredVx - phys.vx) * boat.acceleration;
      phys.ay = (desiredVy - phys.vy) * boat.acceleration;

      boat.cooldown = Math.max(0, boat.cooldown - dt);
      if (pDist <= boat.fireRange && boat.cooldown <= 0) {
        boat.cooldown = boat.fireInterval;
        const jitter = (this.rng.float01() - 0.5) * 0.18;
        const cs = Math.cos(jitter);
        const sn = Math.sin(jitter);
        const nx = (px / (pDist || 1)) * cs - (py / (pDist || 1)) * sn;
        const ny = (px / (pDist || 1)) * sn + (py / (pDist || 1)) * cs;
        this.fireEvents.push({
          faction: 'enemy',
          kind: 'missile',
          sx: t.tx,
          sy: t.ty,
          dx: nx,
          dy: ny,
          speed: 18,
          ttl: 0.9,
          radius: 0.14,
          damage: 4,
        });
      }
    });

    if (landed.length > 0) {
      for (let i = 0; i < landed.length; i += 1) {
        this.onReachTarget(landed[i]!);
      }
    }
  }
}
