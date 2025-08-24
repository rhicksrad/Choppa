import type { System } from '../../core/ecs/systems';
import type { ComponentStore } from '../../core/ecs/components';
import type { Transform } from '../components/Transform';
import type { Physics } from '../components/Physics';
import type { WeaponHolder, WeaponKind } from '../components/Weapon';
import type { Ammo } from '../components/Ammo';
import type { InputSnapshot } from '../../core/input/input';
import { RNG } from '../../core/util/rng';

export type FireEvent =
  | {
      faction: 'player' | 'enemy';
      kind: 'cannon';
      sx: number;
      sy: number;
      dx: number;
      dy: number;
      spread: number;
    }
  | { faction: 'player' | 'enemy'; kind: 'rocket'; x: number; y: number; vx: number; vy: number }
  | {
      faction: 'player' | 'enemy';
      kind: 'missile';
      x: number;
      y: number;
      vx: number;
      vy: number;
      targetX: number;
      targetY: number;
    };

export class WeaponFireSystem implements System {
  private input: InputSnapshot | null = null;
  private aimTileX = 0;
  private aimTileY = 0;
  private eventsOut: FireEvent[];
  private rng: RNG;

  constructor(
    private transforms: ComponentStore<Transform>,
    private physics: ComponentStore<Physics>,
    private weapons: ComponentStore<WeaponHolder>,
    private ammo: ComponentStore<Ammo>,
    eventsOut: FireEvent[],
    rng: RNG,
  ) {
    this.eventsOut = eventsOut;
    this.rng = rng;
  }

  public setInput(snapshot: InputSnapshot, aimTileX: number, aimTileY: number): void {
    this.input = snapshot;
    this.aimTileX = aimTileX;
    this.aimTileY = aimTileY;
  }

  update(dt: number): void {
    // Cooldowns decay
    this.weapons.forEach((entity, w) => {
      w.cooldownCannon = Math.max(0, w.cooldownCannon - dt);
      w.cooldownRocket = Math.max(0, w.cooldownRocket - dt);
      w.cooldownMissile = Math.max(0, w.cooldownMissile - dt);
    });

    const snap = this.input;
    if (!snap) return;

    // Cycle weapon
    if (snap.keys['r'] || snap.keys['R']) {
      this.weapons.forEach((_e, w) => {
        w.active = nextWeapon(w.active);
      });
    }

    // Fire inputs
    const isLmb = (snap.mouseButtons & (1 << 0)) !== 0;
    const isMmb = (snap.mouseButtons & (1 << 1)) !== 0;
    const isRmb = (snap.mouseButtons & (1 << 2)) !== 0;

    this.weapons.forEach((entity, w) => {
      const t = this.transforms.get(entity);
      if (!t) return;
      const ph = this.physics.get(entity);
      const ammo = this.ammo.get(entity);
      if (!ph || !ammo) return;

      // Aim direction from entity to aim tile
      const ax = this.aimTileX - t.tx;
      const ay = this.aimTileY - t.ty;
      const ad = Math.hypot(ax, ay) || 1;
      const dirX = ax / ad;
      const dirY = ay / ad;

      // Active-weapon fire (also direct-mapped buttons)
      if ((w.active === 'cannon' && isLmb) || isLmb) {
        // Cannon: short cooldown, spread, hitscan
        if (w.cooldownCannon <= 0 && ammo.cannon > 0) {
          w.cooldownCannon = 0.08;
          ammo.cannon = Math.max(0, ammo.cannon - 1);
          const spread = 0.08; // radians
          const jitter = (this.rng.float01() - 0.5) * 2 * spread;
          const cs = Math.cos(jitter);
          const sn = Math.sin(jitter);
          const dx = dirX * cs - dirY * sn;
          const dy = dirX * sn + dirY * cs;
          this.eventsOut.push({
            faction: 'player',
            kind: 'cannon',
            sx: t.tx,
            sy: t.ty,
            dx,
            dy,
            spread,
          });
        }
      }

      if ((w.active === 'rocket' && isRmb) || isRmb) {
        if (w.cooldownRocket <= 0 && ammo.rockets > 0) {
          w.cooldownRocket = 0.4;
          ammo.rockets = Math.max(0, ammo.rockets - 1);
          const speed = 6;
          this.eventsOut.push({
            faction: 'player',
            kind: 'rocket',
            x: t.tx,
            y: t.ty,
            vx: dirX * speed,
            vy: dirY * speed,
          });
        }
      }

      if ((w.active === 'missile' && isMmb) || isMmb || snap.keys['x'] || snap.keys['X']) {
        if (w.cooldownMissile <= 0 && ammo.missiles > 0) {
          w.cooldownMissile = 1.0;
          ammo.missiles = Math.max(0, ammo.missiles - 1);
          const speed = 5.5;
          this.eventsOut.push({
            faction: 'player',
            kind: 'missile',
            x: t.tx,
            y: t.ty,
            vx: dirX * speed,
            vy: dirY * speed,
            targetX: this.aimTileX,
            targetY: this.aimTileY,
          });
        }
      }
    });
  }
}

function nextWeapon(k: WeaponKind): WeaponKind {
  if (k === 'cannon') return 'rocket';
  if (k === 'rocket') return 'missile';
  return 'cannon';
}
