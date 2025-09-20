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
      kind: 'missile';
      sx: number;
      sy: number;
      dx: number;
      dy: number;
      spread: number;
      launchOffset?: number;
      speed?: number;
      ttl?: number;
      radius?: number;
      damage?: number;
      damageRadius?: number;
    }
  | { faction: 'player' | 'enemy'; kind: 'rocket'; x: number; y: number; vx: number; vy: number }
  | {
      faction: 'player' | 'enemy';
      kind: 'hellfire';
      x: number;
      y: number;
      vx: number;
      vy: number;
      speed?: number;
      launchOffset?: number;
      targetX: number;
      targetY: number;
      ttl?: number;
      radius?: number;
      damage?: number;
      damageRadius?: number;
    };

export class WeaponFireSystem implements System {
  private input: InputSnapshot | null = null;
  private aimTileX = 0;
  private aimTileY = 0;
  private eventsOut: FireEvent[];
  private rng: RNG;
  private switchHeld = false;

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
      w.cooldownMissile = Math.max(0, w.cooldownMissile - dt);
      w.cooldownRocket = Math.max(0, w.cooldownRocket - dt);
      w.cooldownHellfire = Math.max(0, w.cooldownHellfire - dt);
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

      if (snap.keys['1']) w.active = 'missile';
      else if (snap.keys['2']) w.active = 'rocket';
      else if (snap.keys['3']) w.active = 'hellfire';

      // Aim direction from entity to aim tile
      const ax = this.aimTileX - t.tx;
      const ay = this.aimTileY - t.ty;
      const ad = Math.hypot(ax, ay) || 1;
      const dirX = ax / ad;
      const dirY = ay / ad;

      // Active-weapon fire (also direct-mapped buttons)
      if ((w.active === 'missile' && (isLmb || primaryKey)) || isLmb || primaryKey) {
        // Missile: rapid salvo with fast launch and splash damage
        if (w.cooldownMissile <= 0 && ammo.missiles > 0) {
          w.cooldownMissile = 0.1;
          ammo.missiles = Math.max(0, ammo.missiles - 1);
          const spread = 0.08; // radians
          const jitter = (this.rng.float01() - 0.5) * 2 * spread;
          const cs = Math.cos(jitter);
          const sn = Math.sin(jitter);
          const dx = dirX * cs - dirY * sn;
          const dy = dirX * sn + dirY * cs;
          this.eventsOut.push({
            faction: 'player',
            kind: 'missile',
            sx: t.tx,
            sy: t.ty,
            dx,
            dy,
            spread,
            launchOffset: 0.65,
            speed: 26,
            ttl: 1.2,
            radius: 0.16,
            damage: 12,
            damageRadius: 0.7,
          });
        }
      }

      if ((w.active === 'rocket' && (isRmb || secondaryKey)) || isRmb || secondaryKey) {
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

      if ((w.active === 'hellfire' && (isMmb || specialKey)) || isMmb || specialKey) {
        if (w.cooldownHellfire <= 0 && ammo.hellfires > 0) {
          w.cooldownHellfire = 1.25;
          ammo.hellfires = Math.max(0, ammo.hellfires - 1);
          const speed = 20;
          const launchOffset = 0.78;
          this.eventsOut.push({
            faction: 'player',
            kind: 'hellfire',
            x: t.tx,
            y: t.ty,
            vx: dirX * speed,
            vy: dirY * speed,
            speed,
            launchOffset,
            targetX: this.aimTileX,
            targetY: this.aimTileY,
            ttl: 6,
            radius: 0.22,
            damage: 32,
            damageRadius: 1.25,
          });
        }
      }
    });
  }
}

function nextWeapon(k: WeaponKind): WeaponKind {
  if (k === 'missile') return 'rocket';
  if (k === 'rocket') return 'hellfire';
  return 'missile';
}
