import type { System } from '../../core/ecs/systems';
import type { ComponentStore } from '../../core/ecs/components';
import type { Transform } from '../components/Transform';
import type { Physics } from '../components/Physics';
import type { PatrolDrone, ChaserDrone } from '../components/AI';
import type { FireEvent } from './WeaponFire';
import { RNG } from '../../core/util/rng';

export class EnemyBehaviorSystem implements System {
  constructor(
    private transforms: ComponentStore<Transform>,
    private physics: ComponentStore<Physics>,
    private patrols: ComponentStore<PatrolDrone>,
    private chasers: ComponentStore<ChaserDrone>,
    private fireEvents: FireEvent[],
    private rng: RNG,
    private getPlayer: () => { x: number; y: number },
  ) {}

  update(dt: number): void {
    const player = this.getPlayer();

    this.patrols.forEach((entity, patrol) => {
      const t = this.transforms.get(entity);
      const phys = this.physics.get(entity);
      if (!t || !phys) return;

      // Patrol motion along a single axis
      if (patrol.axis === 'x') {
        if (t.tx > patrol.originX + patrol.range) patrol.direction = -1;
        else if (t.tx < patrol.originX - patrol.range) patrol.direction = 1;
        const targetV = patrol.direction * patrol.speed;
        phys.ax = (targetV - phys.vx) * 3;
        phys.ay = (0 - phys.vy) * 3;
      } else {
        if (t.ty > patrol.originY + patrol.range) patrol.direction = -1;
        else if (t.ty < patrol.originY - patrol.range) patrol.direction = 1;
        const targetV = patrol.direction * patrol.speed;
        phys.ay = (targetV - phys.vy) * 3;
        phys.ax = (0 - phys.vx) * 3;
      }

      // Firing logic
      patrol.cooldown = Math.max(0, patrol.cooldown - dt);
      const dx = player.x - t.tx;
      const dy = player.y - t.ty;
      const dist = Math.hypot(dx, dy);
      if (dist <= patrol.fireRange && patrol.cooldown <= 0) {
        patrol.cooldown = patrol.fireInterval;
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        this.fireEvents.push({
          faction: 'enemy',
          kind: 'missile',
          sx: t.tx,
          sy: t.ty,
          dx: nx,
          dy: ny,
          spread: 0.12,
          speed: 18,
          ttl: 0.9,
          radius: 0.12,
          damage: 4,
        });
      }
    });

    this.chasers.forEach((entity, chaser) => {
      const t = this.transforms.get(entity);
      const phys = this.physics.get(entity);
      if (!t || !phys) return;

      const dx = player.x - t.tx;
      const dy = player.y - t.ty;
      const dist = Math.hypot(dx, dy) || 1;

      let holdingPosition = false;
      const guard = chaser.guard;
      if (guard) {
        const homeDx = guard.homeX - t.tx;
        const homeDy = guard.homeY - t.ty;
        const homeDist = Math.hypot(homeDx, homeDy);
        const playerHomeDist = Math.hypot(player.x - guard.homeX, player.y - guard.homeY);

        if (!guard.alerted && playerHomeDist <= guard.aggroRange) guard.alerted = true;
        else if (guard.alerted && playerHomeDist > guard.leashRange) guard.alerted = false;

        if (!guard.alerted) {
          holdingPosition = true;
          if (homeDist > guard.holdRadius) {
            const safeDist = homeDist || 1;
            const desiredVx = (homeDx / safeDist) * Math.min(chaser.speed * 0.6, safeDist * 2.4);
            const desiredVy = (homeDy / safeDist) * Math.min(chaser.speed * 0.6, safeDist * 2.4);
            phys.ax = (desiredVx - phys.vx) * chaser.acceleration;
            phys.ay = (desiredVy - phys.vy) * chaser.acceleration;
          } else {
            phys.ax = (0 - phys.vx) * chaser.acceleration * 0.6;
            phys.ay = (0 - phys.vy) * chaser.acceleration * 0.6;
          }
        }
      }

      if (!holdingPosition) {
        const desiredVx = (dx / dist) * chaser.speed;
        const desiredVy = (dy / dist) * chaser.speed;
        phys.ax = (desiredVx - phys.vx) * chaser.acceleration;
        phys.ay = (desiredVy - phys.vy) * chaser.acceleration;
      }

      chaser.cooldown = Math.max(0, chaser.cooldown - dt);
      if (dist <= chaser.fireRange && chaser.cooldown <= 0) {
        chaser.cooldown = chaser.fireInterval;
        const jitter = (this.rng.float01() - 0.5) * 2 * chaser.spread;
        const cs = Math.cos(jitter);
        const sn = Math.sin(jitter);
        const dirX = (dx / dist) * cs - (dy / dist) * sn;
        const dirY = (dx / dist) * sn + (dy / dist) * cs;
        const weapon = chaser.weapon;
        if (weapon && weapon.kind === 'laser') {
          this.fireEvents.push({
            faction: 'enemy',
            kind: 'laser',
            sx: t.tx,
            sy: t.ty,
            dx: dirX,
            dy: dirY,
            speed: weapon.speed,
            ttl: weapon.ttl,
            radius: weapon.radius,
            damage: weapon.damage,
            damageRadius: weapon.damageRadius,
            launchOffset: weapon.launchOffset,
          });
        } else {
          this.fireEvents.push({
            faction: 'enemy',
            kind: 'missile',
            sx: t.tx,
            sy: t.ty,
            dx: dirX,
            dy: dirY,
            spread: chaser.spread,
            speed: weapon?.speed ?? 20,
            ttl: weapon?.ttl ?? 1.0,
            radius: weapon?.radius ?? 0.1,
            damage: weapon?.damage ?? 5,
            damageRadius: weapon?.damageRadius,
            launchOffset: weapon?.launchOffset,
          });
        }
      }
    });
  }
}
