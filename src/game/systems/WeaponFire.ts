import type { System } from '../../core/ecs/systems';
import type { ComponentStore } from '../../core/ecs/components';
import type { Transform } from '../components/Transform';
import type { Physics } from '../components/Physics';
import type { WeaponHolder } from '../components/Weapon';
import type { Ammo } from '../components/Ammo';
import type { InputSnapshot } from '../../core/input/input';
import { RNG } from '../../core/util/rng';

export const DEFAULT_MACHINE_GUN_COOLDOWN = 0.1;
export const DEFAULT_MACHINE_GUN_PROJECTILE_SPEED = 22;
export const DEFAULT_MACHINE_GUN_PROJECTILE_RADIUS = 0.08;
export const DEFAULT_MACHINE_GUN_DAMAGE = 8;
export const DEFAULT_MACHINE_GUN_DAMAGE_RADIUS = 0.12;

export const DEFAULT_ROCKET_COOLDOWN = 0.4;
export const DEFAULT_ROCKET_PROJECTILE_SPEED = 8.8;
export const DEFAULT_ROCKET_PROJECTILE_RADIUS = 0.22;
export const DEFAULT_ROCKET_DAMAGE = 19.2;
export const DEFAULT_ROCKET_DAMAGE_RADIUS = 0.9;

export const DEFAULT_HELLFIRE_COOLDOWN = 1.25;
export const DEFAULT_HELLFIRE_PROJECTILE_SPEED = 24;
export const DEFAULT_HELLFIRE_PROJECTILE_RADIUS = 0.3;
export const DEFAULT_HELLFIRE_LAUNCH_OFFSET = 0.92;
export const DEFAULT_HELLFIRE_DAMAGE = 36;
export const DEFAULT_HELLFIRE_DAMAGE_RADIUS = 1.9;

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
  | {
      faction: 'player' | 'enemy';
      kind: 'laser';
      sx: number;
      sy: number;
      dx: number;
      dy: number;
      speed?: number;
      ttl?: number;
      radius?: number;
      damage?: number;
      damageRadius?: number;
      launchOffset?: number;
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
      damageRadius?: number;
    }
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
  private canFire = true;
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

  public setInput(
    snapshot: InputSnapshot,
    aimTileX: number,
    aimTileY: number,
    canFire = true,
  ): void {
    this.input = snapshot;
    this.aimTileX = aimTileX;
    this.aimTileY = aimTileY;
    this.canFire = canFire;
  }

  update(_dt: number): void {
    // Cooldowns decay
    this.weapons.forEach((_, w) => {
      w.cooldownMissile = Math.max(0, w.cooldownMissile - _dt);
      w.cooldownRocket = Math.max(0, w.cooldownRocket - _dt);
      w.cooldownHellfire = Math.max(0, w.cooldownHellfire - _dt);
    });

    const snap = this.input;
    if (!snap) return;

    if (!this.canFire) {
      this.weapons.forEach((_entity, w) => {
        if (w.active !== 'missile') w.active = 'missile';
      });
      return;
    }

    // Fire inputs
    const isLmb = (snap.mouseButtons & (1 << 0)) !== 0;
    const isMmb = (snap.mouseButtons & (1 << 1)) !== 0;
    const isRmb = (snap.mouseButtons & (1 << 2)) !== 0;
    const machineGunKey = snap.keys[' '] || snap.keys['Space'] || snap.keys['Spacebar'];
    const missileKey = snap.keys['Shift'] || snap.keys['ShiftLeft'] || snap.keys['ShiftRight'];
    const hellfireKey =
      snap.keys['Control'] || snap.keys['ControlLeft'] || snap.keys['ControlRight'];
    const machineGunDown = isLmb || machineGunKey;
    const missileDown = isRmb || missileKey;
    const hellfireDown = isMmb || hellfireKey;

    this.weapons.forEach((entity, w) => {
      const t = this.transforms.get(entity);
      if (!t) return;
      const ph = this.physics.get(entity);
      const ammo = this.ammo.get(entity);
      if (!ph || !ammo) return;

      w.active = hellfireDown ? 'hellfire' : missileDown ? 'rocket' : 'missile';

      // Aim direction from entity to aim tile
      const ax = this.aimTileX - t.tx;
      const ay = this.aimTileY - t.ty;
      const ad = Math.hypot(ax, ay) || 1;
      const dirX = ax / ad;
      const dirY = ay / ad;

      // Machine gun (LMB / Space)
      if (machineGunDown) {
        if (w.cooldownMissile <= 0 && ammo.missiles > 0) {
          const fireDelay = w.machineGunFireDelay ?? DEFAULT_MACHINE_GUN_COOLDOWN;
          w.cooldownMissile = fireDelay;
          ammo.missiles = Math.max(0, ammo.missiles - 1);
          const spread = 0.08; // radians
          const jitter = (this.rng.float01() - 0.5) * 2 * spread;
          const cs = Math.cos(jitter);
          const sn = Math.sin(jitter);
          const dx = dirX * cs - dirY * sn;
          const dy = dirX * sn + dirY * cs;
          const projectileSpeed =
            w.machineGunProjectileSpeed ?? DEFAULT_MACHINE_GUN_PROJECTILE_SPEED;
          const damage = w.machineGunDamage ?? DEFAULT_MACHINE_GUN_DAMAGE;
          const damageRadius = w.machineGunDamageRadius ?? DEFAULT_MACHINE_GUN_DAMAGE_RADIUS;
          this.eventsOut.push({
            faction: 'player',
            kind: 'missile',
            sx: t.tx,
            sy: t.ty,
            dx,
            dy,
            spread,
            launchOffset: 0.48,
            speed: projectileSpeed,
            ttl: 0.6,
            radius: DEFAULT_MACHINE_GUN_PROJECTILE_RADIUS,
            damage,
            damageRadius,
          });
        }
      }

      // Missiles (RMB / Shift)
      if (missileDown) {
        if (w.cooldownRocket <= 0 && ammo.rockets > 0) {
          const fireDelay = w.rocketFireDelay ?? DEFAULT_ROCKET_COOLDOWN;
          w.cooldownRocket = fireDelay;
          ammo.rockets = Math.max(0, ammo.rockets - 1);
          const speed = w.rocketProjectileSpeed ?? DEFAULT_ROCKET_PROJECTILE_SPEED;
          const damage = w.rocketDamage ?? DEFAULT_ROCKET_DAMAGE;
          const damageRadius = w.rocketDamageRadius ?? DEFAULT_ROCKET_DAMAGE_RADIUS;
          this.eventsOut.push({
            faction: 'player',
            kind: 'rocket',
            x: t.tx,
            y: t.ty,
            vx: dirX * speed,
            vy: dirY * speed,
            ttl: 5.2,
            radius: DEFAULT_ROCKET_PROJECTILE_RADIUS,
            damage,
            damageRadius,
          });
        }
      }

      // Hellfires (MMB / Ctrl)
      if (hellfireDown) {
        if (w.cooldownHellfire <= 0 && ammo.hellfires > 0) {
          const fireDelay = w.hellfireFireDelay ?? DEFAULT_HELLFIRE_COOLDOWN;
          w.cooldownHellfire = fireDelay;
          ammo.hellfires = Math.max(0, ammo.hellfires - 1);
          const speed = w.hellfireProjectileSpeed ?? DEFAULT_HELLFIRE_PROJECTILE_SPEED;
          const launchOffset = w.hellfireLaunchOffset ?? DEFAULT_HELLFIRE_LAUNCH_OFFSET;
          const damage = w.hellfireDamage ?? DEFAULT_HELLFIRE_DAMAGE;
          const damageRadius = w.hellfireDamageRadius ?? DEFAULT_HELLFIRE_DAMAGE_RADIUS;
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
            ttl: 3.2,
            radius: DEFAULT_HELLFIRE_PROJECTILE_RADIUS,
            damage,
            damageRadius,
          });
        }
      }
    });
  }
}
