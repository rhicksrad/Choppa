import type { System } from '../../core/ecs/systems';
import type { ComponentStore } from '../../core/ecs/components';
import type { Transform } from '../components/Transform';
import type { Physics } from '../components/Physics';
import type { WeaponHolder } from '../components/Weapon';
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

  update(_dt: number): void {
    // Cooldowns decay
    this.weapons.forEach((_, w) => {
      w.cooldownMissile = Math.max(0, w.cooldownMissile - _dt);
      w.cooldownRocket = Math.max(0, w.cooldownRocket - _dt);
      w.cooldownHellfire = Math.max(0, w.cooldownHellfire - _dt);
    });

    const snap = this.input;
    if (!snap) return;

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
            launchOffset: 0.48,
            speed: 22,
            ttl: 0.6,
            radius: 0.08,
            damage: 8,
            damageRadius: 0.12,
          });
        }
      }

      // Missiles (RMB / Shift)
      if (missileDown) {
        if (w.cooldownRocket <= 0 && ammo.rockets > 0) {
          w.cooldownRocket = 0.4;
          ammo.rockets = Math.max(0, ammo.rockets - 1);
          const speed = 8.8;
          this.eventsOut.push({
            faction: 'player',
            kind: 'rocket',
            x: t.tx,
            y: t.ty,
            vx: dirX * speed,
            vy: dirY * speed,
            ttl: 5.2,
            radius: 0.22,
            damage: 19.2,
            damageRadius: 0.9,
          });
        }
      }

      // Hellfires (MMB / Ctrl)
      if (hellfireDown) {
        if (w.cooldownHellfire <= 0 && ammo.hellfires > 0) {
          w.cooldownHellfire = 1.25;
          ammo.hellfires = Math.max(0, ammo.hellfires - 1);
          const speed = 24;
          const launchOffset = 0.92;
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
            radius: 0.3,
            damage: 36,
            damageRadius: 1.9,
          });
        }
      }
    });
  }
}
