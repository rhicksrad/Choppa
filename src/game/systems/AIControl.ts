import type { System } from '../../core/ecs/systems';
import type { ComponentStore } from '../../core/ecs/components';
import type { Transform } from '../components/Transform';
import type { AAA, SAM } from '../components/AI';
import type { FireEvent } from './WeaponFire';
import { RNG } from '../../core/util/rng';

export class AIControlSystem implements System {
  constructor(
    private transforms: ComponentStore<Transform>,
    private aaas: ComponentStore<AAA>,
    private sams: ComponentStore<SAM>,
    private fireEvents: FireEvent[],
    private rng: RNG,
    private getPlayerTile: () => { x: number; y: number },
  ) {}

  update(dt: number): void {
    const player = this.getPlayerTile();

    // AAA: lead shots
    this.aaas.forEach((_e, gun) => {
      gun.cooldown = Math.max(0, gun.cooldown - dt);
      if (gun.cooldown > 0) return;
      const t = this.transforms.get(_e);
      if (!t) return;
      const dx = player.x - t.tx;
      const dy = player.y - t.ty;
      const dist = Math.hypot(dx, dy);
      if (dist > gun.range) return;
      gun.cooldown = gun.fireInterval;
      const dirX = dx / (dist || 1);
      const dirY = dy / (dist || 1);
      const jitter = (this.rng.float01() - 0.5) * 2 * gun.spread;
      const cs = Math.cos(jitter);
      const sn = Math.sin(jitter);
      const dpx = dirX * cs - dirY * sn;
      const dpy = dirX * sn + dirY * cs;
      this.fireEvents.push({
        faction: 'enemy',
        kind: 'missile',
        sx: t.tx,
        sy: t.ty,
        dx: dpx,
        dy: dpy,
        spread: gun.spread,
      });
    });

    // SAM: lock and fire hellfire missile
    this.sams.forEach((_e, sam) => {
      sam.cooldown = Math.max(0, sam.cooldown - dt);
      const t = this.transforms.get(_e);
      if (!t) return;
      const dx = player.x - t.tx;
      const dy = player.y - t.ty;
      const dist = Math.hypot(dx, dy);
      if (dist > sam.range) {
        sam.lockProgress = 0;
        return;
      }
      if (sam.lockProgress < sam.lockTime) sam.lockProgress += dt;
      if (sam.cooldown <= 0 && sam.lockProgress >= sam.lockTime) {
        sam.cooldown = sam.fireInterval;
        const dirX = dx / (dist || 1);
        const dirY = dy / (dist || 1);
        this.fireEvents.push({
          faction: 'enemy',
          kind: 'hellfire',
          x: t.tx,
          y: t.ty,
          vx: dirX * sam.missileSpeed,
          vy: dirY * sam.missileSpeed,
          targetX: player.x,
          targetY: player.y,
        });
        sam.lockProgress = 0;
      }
    });
  }
}
