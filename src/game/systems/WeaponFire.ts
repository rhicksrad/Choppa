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
      speed?: number;
      ttl?: number;
      radius?: number;
      damage?: number;
    }
  | {
      faction: 'player' | 'enemy';
      kind: 'rocket';
      x: number;
      y: number;
      vx: number;
      vy: number;
      ttl?: number;
      radius?: number;
      damage?: number;
    }
  | {
      faction: 'player' | 'enemy';
      kind: 'missile';
      x: number;
      y: number;
      vx: number;
      vy: number;
      targetX: number;
      targetY: number;
      ttl?: number;
      radius?: number;
      damage?: number;
    };

export interface WeaponModifiers {
  cannonRate: number;
  cannonDamage: number;
  rocketDamage: number;
  rocketSpeed: number;
  missileDamage: number;
  missileSpeed: number;
}

export class WeaponFireSystem implements System {
  private input: InputSnapshot | null = null;
  private aimTileX = 0;
  private aimTileY = 0;
  private eventsOut: FireEvent[];
  private rng: RNG;
  private switchHeld = false;
  private mods: WeaponModifiers = {
    cannonRate: 1,
    cannonDamage: 1,
    rocketDamage: 1,
    rocketSpeed: 1,
    missileDamage: 1,
    missileSpeed: 1,
  };

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

  public setModifiers(mods: WeaponModifiers): void {
    this.mods = mods;
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
    const switchDown =
      snap.keys['r'] || snap.keys['R'] || snap.keys['q'] || snap.keys['Q'] || snap.keys['Tab'];
    if (switchDown && !this.switchHeld) {
      this.weapons.forEach((_e, w) => {
        w.active = nextWeapon(w.active);
      });
    }
    this.switchHeld = switchDown;

    // Fire inputs
    const isLmb = (snap.mouseButtons & (1 << 0)) !== 0;
    const isMmb = (snap.mouseButtons & (1 << 1)) !== 0;
    const isRmb = (snap.mouseButtons & (1 << 2)) !== 0;
    const primaryKey = snap.keys[' '] || snap.keys['Space'] || snap.keys['Enter'] || snap.keys['z'];
    const secondaryKey =
      snap.keys['Shift'] ||
      snap.keys['ShiftLeft'] ||
      snap.keys['ShiftRight'] ||
      snap.keys['Control'];
    const specialKey = snap.keys['e'] || snap.keys['E'] || snap.keys['x'] || snap.keys['X'];

    this.weapons.forEach((entity, w) => {
      const t = this.transforms.get(entity);
      if (!t) return;
      const ph = this.physics.get(entity);
      const ammo = this.ammo.get(entity);
      if (!ph || !ammo) return;

      if (snap.keys['1']) w.active = 'cannon';
      else if (snap.keys['2']) w.active = 'rocket';
      else if (snap.keys['3']) w.active = 'missile';

      // Aim direction from entity to aim tile
      const ax = this.aimTileX - t.tx;
      const ay = this.aimTileY - t.ty;
      const ad = Math.hypot(ax, ay) || 1;
      const dirX = ax / ad;
      const dirY = ay / ad;

      // Active-weapon fire (also direct-mapped buttons)
      if ((w.active === 'cannon' && (isLmb || primaryKey)) || isLmb || primaryKey) {
        // Cannon: short cooldown, spread, hitscan
        if (w.cooldownCannon <= 0 && ammo.cannon > 0) {
          const cd = 0.08 / Math.max(0.25, this.mods.cannonRate);
          w.cooldownCannon = cd;
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
            speed: 22 * this.mods.cannonRate,
            ttl: 1.1,
            radius: 0.12,
            damage: 6 * this.mods.cannonDamage,
          });
        }
      }

      if ((w.active === 'rocket' && (isRmb || secondaryKey)) || isRmb || secondaryKey) {
        if (w.cooldownRocket <= 0 && ammo.rockets > 0) {
          w.cooldownRocket = 0.4;
          ammo.rockets = Math.max(0, ammo.rockets - 1);
          const speed = 6 * this.mods.rocketSpeed;
          this.eventsOut.push({
            faction: 'player',
            kind: 'rocket',
            x: t.tx,
            y: t.ty,
            vx: dirX * speed,
            vy: dirY * speed,
            damage: 12 * this.mods.rocketDamage,
            radius: 0.6 * Math.max(0.7, this.mods.rocketDamage),
          });
        }
      }

      if ((w.active === 'missile' && (isMmb || specialKey)) || isMmb || specialKey) {
        if (w.cooldownMissile <= 0 && ammo.missiles > 0) {
          w.cooldownMissile = 1.0;
          ammo.missiles = Math.max(0, ammo.missiles - 1);
          const speed = 5.5 * this.mods.missileSpeed;
          this.eventsOut.push({
            faction: 'player',
            kind: 'missile',
            x: t.tx,
            y: t.ty,
            vx: dirX * speed,
            vy: dirY * speed,
            targetX: this.aimTileX,
            targetY: this.aimTileY,
            damage: 18 * this.mods.missileDamage,
            radius: 0.9 * Math.max(0.7, this.mods.missileDamage),
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
