import type { System } from '../../core/ecs/systems';
import type { ComponentStore } from '../../core/ecs/components';
import type { Transform } from '../components/Transform';
import type { Physics } from '../components/Physics';
import type { Boss } from '../components/Boss';
import type { Health } from '../components/Health';
import type { FireEvent } from './WeaponFire';
import { RNG } from '../../core/util/rng';

export class BossBehaviorSystem implements System {
  constructor(
    private transforms: ComponentStore<Transform>,
    private physics: ComponentStore<Physics>,
    private bosses: ComponentStore<Boss>,
    private healths: ComponentStore<Health>,
    private fireEvents: FireEvent[],
    private rng: RNG,
    private getPlayer: () => { x: number; y: number },
  ) {}

  update(dt: number): void {
    const player = this.getPlayer();
    this.bosses.forEach((entity, boss) => {
      const transform = this.transforms.get(entity);
      const phys = this.physics.get(entity);
      const health = this.healths.get(entity);
      if (!transform || !phys || !health || health.current <= 0) return;

      const dx = player.x - transform.tx;
      const dy = player.y - transform.ty;
      const dist = Math.hypot(dx, dy) || 1;
      const dirX = dx / dist;
      const dirY = dy / dist;
      const preferredRange = boss.enraged ? 4.2 : 5.2;
      const rangeDelta = dist - preferredRange;
      const pursueStrength = Math.max(-1, Math.min(1, rangeDelta * 0.45));
      const maxSpeed = boss.enraged ? 2.4 : 1.8;
      phys.ax = dirX * pursueStrength * maxSpeed - phys.vx * 1.4;
      phys.ay = dirY * pursueStrength * maxSpeed - phys.vy * 1.4;

      const healthFraction = health.current / health.max;
      if (!boss.enraged && healthFraction <= 0.5) {
        boss.enraged = true;
        boss.scytheTimer = Math.min(boss.scytheTimer, boss.scytheCooldown * 0.35);
        boss.spineTimer = Math.min(boss.spineTimer, boss.spineCooldown * 0.4);
        boss.quakeTimer = Math.min(boss.quakeTimer, boss.quakeCooldown * 0.45);
      }

      boss.scytheTimer -= dt;
      if (boss.scytheTimer <= 0) {
        boss.scytheTimer = boss.scytheCooldown * (boss.enraged ? 0.65 : 1);
        const beams = boss.enraged ? 8 : 6;
        const speed = boss.enraged ? 42 : 34;
        const damage = boss.enraged ? 18 : 14;
        const ttl = boss.enraged ? 0.6 : 0.55;
        for (let i = 0; i < beams; i += 1) {
          const angle = (Math.PI * 2 * i) / beams;
          const dirCx = Math.cos(angle);
          const dirCy = Math.sin(angle);
          this.fireEvents.push({
            faction: 'enemy',
            kind: 'laser',
            sx: transform.tx,
            sy: transform.ty,
            dx: dirCx,
            dy: dirCy,
            speed,
            ttl,
            radius: 0.18,
            damage,
            damageRadius: 0.4,
            launchOffset: 0.2,
          });
        }
      }

      boss.spineTimer -= dt;
      if (boss.spineTimer <= 0) {
        boss.spineTimer = boss.spineCooldown * (boss.enraged ? 0.7 : 1);
        const volleys = boss.enraged ? 6 : 4;
        for (let i = 0; i < volleys; i += 1) {
          const jitter = (this.rng.float01() - 0.5) * (boss.enraged ? 0.35 : 0.45);
          const spreadCos = Math.cos(jitter);
          const spreadSin = Math.sin(jitter);
          const aimX = dirX * spreadCos - dirY * spreadSin;
          const aimY = dirX * spreadSin + dirY * spreadCos;
          this.fireEvents.push({
            faction: 'enemy',
            kind: 'missile',
            sx: transform.tx,
            sy: transform.ty,
            dx: aimX,
            dy: aimY,
            spread: 0,
            speed: boss.enraged ? 22 : 18,
            ttl: 1.2,
            radius: 0.18,
            damage: boss.enraged ? 20 : 16,
            damageRadius: 0.45,
            launchOffset: 0.4,
          });
        }
      }

      boss.quakeTimer -= dt;
      if (boss.quakeTimer <= 0) {
        boss.quakeTimer = boss.quakeCooldown * (boss.enraged ? 0.75 : 1);
        const blasts = boss.enraged ? 6 : 4;
        const radius = boss.enraged ? 2.4 : 1.9;
        const damage = boss.enraged ? 32 : 26;
        for (let i = 0; i < blasts; i += 1) {
          const offsetAngle = (Math.PI * 2 * i) / blasts;
          const offX = Math.cos(offsetAngle) * 0.6;
          const offY = Math.sin(offsetAngle) * 0.6;
          this.fireEvents.push({
            faction: 'enemy',
            kind: 'missile',
            sx: transform.tx + offX,
            sy: transform.ty + offY,
            dx: 0,
            dy: 0,
            speed: 0,
            ttl: 0.05,
            radius: radius * 0.4,
            damage,
            damageRadius: radius,
          });
        }
      }
    });
  }
}
