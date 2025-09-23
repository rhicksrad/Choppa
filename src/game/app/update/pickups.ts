import type { ComponentStore } from '../../../core/ecs/components';
import type { Entity } from '../../../core/ecs/entities';
import type { Transform } from '../../components/Transform';
import type { Pickup } from '../../components/Pickup';
import type { Fuel } from '../../components/Fuel';
import type { Ammo } from '../../components/Ammo';
import type { Health } from '../../components/Health';
import type { GameState } from '../state';
import { SURVIVOR_CAPACITY } from '../state';
import type { PickupCompleteEvent } from '../state';
import type { PadConfig } from '../../scenarios/layouts';
import type { SafeHouseParams } from '../../../render/sprites/safehouse';
import { tileToIso } from '../../../render/iso/projection';
import { getSafeHouseDoorIso } from '../../../render/sprites/safehouse';
import type { RNG } from '../../../core/util/rng';

export interface PickupProcessorDeps {
  state: GameState;
  player: Entity;
  transforms: ComponentStore<Transform>;
  pickups: ComponentStore<Pickup>;
  fuels: ComponentStore<Fuel>;
  ammos: ComponentStore<Ammo>;
  healths: ComponentStore<Health>;
  pickupFactory: {
    beginPickupCraneSound: (entity: Entity, pickup: Pickup) => void;
    cancelPickupCraneSound: (entity: Entity) => void;
    completePickupCraneSound: (entity: Entity) => void;
  };
  destroyEntity: (entity: Entity) => void;
  rng: RNG;
}

export interface PickupProcessor {
  update: (
    dt: number,
    isoParams: { tileWidth: number; tileHeight: number },
    pad: PadConfig,
    safeHouse: SafeHouseParams,
  ) => void;
  spawnRescueRunnerAnimation: (
    count: number,
    isoParams: { tileWidth: number; tileHeight: number },
    pad: PadConfig,
    safeHouse: SafeHouseParams,
  ) => void;
  updateRescueRunners: (dt: number) => void;
}

export function createPickupProcessor({
  state,
  player,
  transforms,
  pickups,
  fuels,
  ammos,
  healths,
  pickupFactory,
  destroyEntity,
  rng,
}: PickupProcessorDeps): PickupProcessor {
  const spawnRescueRunnerAnimation = (
    count: number,
    isoParams: { tileWidth: number; tileHeight: number },
    pad: PadConfig,
    safeHouse: SafeHouseParams,
  ): void => {
    if (count <= 0) return;
    const padOrigin = tileToIso(pad.tx - 0.05, pad.ty + 0.18, isoParams);
    const doorIso = getSafeHouseDoorIso(isoParams, safeHouse);
    for (let i = 0; i < count; i += 1) {
      const jitterStartX = (rng.float01() - 0.5) * 10;
      const jitterStartY = (rng.float01() - 0.5) * 6;
      const jitterEndX = (rng.float01() - 0.5) * 3;
      const jitterEndY = (rng.float01() - 0.5) * 2.4;
      const delay = i * 0.16 + rng.float01() * 0.05;
      const duration = 0.82 + rng.float01() * 0.32;
      state.rescueRunners.push({
        startIso: { x: padOrigin.x + jitterStartX, y: padOrigin.y + jitterStartY },
        endIso: { x: doorIso.x + jitterEndX, y: doorIso.y + jitterEndY },
        progress: 0,
        delay,
        duration,
        elapsed: 0,
        bobOffset: rng.float01() * Math.PI * 2,
      });
    }
  };

  const updateRescueRunners = (dt: number): void => {
    for (let i = state.rescueRunners.length - 1; i >= 0; i -= 1) {
      const runner = state.rescueRunners[i]!;
      if (runner.delay > 0) {
        runner.delay -= dt;
        if (runner.delay > 0) continue;
        runner.delay = 0;
      }
      runner.elapsed += dt;
      runner.progress += dt / runner.duration;
      if (runner.progress >= 1.3) {
        state.rescueRunners.splice(i, 1);
      }
    }
  };

  const update = (
    dt: number,
    isoParams: { tileWidth: number; tileHeight: number },
    pad: PadConfig,
    safeHouse: SafeHouseParams,
  ): void => {
    const completed: PickupCompleteEvent[] = [];
    let reservedSurvivors = 0;

    pickups.forEach((_entity, pickup) => {
      if (pickup.kind === 'survivor' && pickup.collectingBy === player) {
        reservedSurvivors += pickup.survivorCount ?? 1;
      }
    });

    pickups.forEach((entity, pickup) => {
      const pickupTransform = transforms.get(entity);
      if (!pickupTransform) {
        pickupFactory.completePickupCraneSound(entity);
        completed.push({
          entity,
          kind: pickup.kind,
          fuelAmount: pickup.fuelAmount,
          ammo: pickup.ammo ? { ...pickup.ammo } : undefined,
          survivorCount: pickup.survivorCount,
          armorAmount: pickup.armorAmount,
        });
        return;
      }

      if (pickup.collectingBy === player) {
        const survivorCount = pickup.kind === 'survivor' ? (pickup.survivorCount ?? 1) : 0;
        const playerTransform = transforms.get(player)!;
        const dx = pickupTransform.tx - playerTransform.tx;
        const dy = pickupTransform.ty - playerTransform.ty;
        const dist = Math.hypot(dx, dy);
        if (dist > pickup.radius + 0.4 || state.player.invulnerable) {
          if (survivorCount > 0) {
            reservedSurvivors = Math.max(0, reservedSurvivors - survivorCount);
          }
          pickup.collectingBy = null;
          pickup.progress = 0;
          pickupFactory.cancelPickupCraneSound(entity);
          return;
        }
        pickup.progress = Math.min(1, pickup.progress + dt / pickup.duration);
        if (pickup.progress >= 1) {
          pickupFactory.completePickupCraneSound(entity);
          completed.push({
            entity,
            kind: pickup.kind,
            fuelAmount: pickup.fuelAmount,
            ammo: pickup.ammo ? { ...pickup.ammo } : undefined,
            survivorCount: pickup.survivorCount,
            armorAmount: pickup.armorAmount,
          });
        }
        return;
      }

      if (pickup.collectingBy && !transforms.has(pickup.collectingBy)) {
        pickup.collectingBy = null;
        pickup.progress = 0;
        pickupFactory.cancelPickupCraneSound(entity);
        return;
      }

      if (pickup.collectingBy === null) {
        const playerTransform = transforms.get(player)!;
        const dx = pickupTransform.tx - playerTransform.tx;
        const dy = pickupTransform.ty - playerTransform.ty;
        const dist = Math.hypot(dx, dy);
        if (dist <= pickup.radius && !state.player.invulnerable) {
          if (pickup.kind === 'fuel') {
            const needsFuel = fuels.get(player)!.current < fuels.get(player)!.max - 0.5;
            if (needsFuel) {
              pickup.collectingBy = player;
              pickup.progress = 0;
              pickupFactory.beginPickupCraneSound(entity, pickup);
            }
          } else if (pickup.kind === 'ammo') {
            const ammoComp = ammos.get(player)!;
            const needsAmmo =
              ammoComp.missiles < ammoComp.missilesMax ||
              ammoComp.rockets < ammoComp.rocketsMax ||
              ammoComp.hellfires < ammoComp.hellfiresMax;
            if (needsAmmo) {
              pickup.collectingBy = player;
              pickup.progress = 0;
              pickupFactory.beginPickupCraneSound(entity, pickup);
            }
          } else if (pickup.kind === 'survivor') {
            const survivors = pickup.survivorCount ?? 1;
            const remainingCapacity = SURVIVOR_CAPACITY - state.rescue.carrying - reservedSurvivors;
            if (remainingCapacity >= survivors) {
              pickup.collectingBy = player;
              pickup.progress = 0;
              pickupFactory.beginPickupCraneSound(entity, pickup);
              reservedSurvivors += survivors;
            }
          } else if (pickup.kind === 'armor') {
            const needsArmor = healths.get(player)!.current < healths.get(player)!.max - 0.5;
            if (needsArmor) {
              pickup.collectingBy = player;
              pickup.progress = 0;
              pickupFactory.beginPickupCraneSound(entity, pickup);
            }
          }
        }
      }
    });

    for (let i = 0; i < completed.length; i += 1) {
      const item = completed[i]!;
      const fuelComp = fuels.get(player)!;
      const ammoComp = ammos.get(player)!;
      const healthComp = healths.get(player)!;
      if (item.kind === 'fuel') {
        const amount = item.fuelAmount ?? 50;
        fuelComp.current = Math.min(fuelComp.max, fuelComp.current + amount);
      } else if (item.kind === 'ammo' && item.ammo) {
        ammoComp.rockets = Math.min(
          ammoComp.rocketsMax,
          ammoComp.rockets + (item.ammo.rockets ?? 0),
        );
        ammoComp.missiles = Math.min(
          ammoComp.missilesMax,
          ammoComp.missiles + (item.ammo.missiles ?? 0),
        );
        ammoComp.hellfires = Math.min(
          ammoComp.hellfiresMax,
          ammoComp.hellfires + (item.ammo.hellfires ?? 0),
        );
      } else if (item.kind === 'armor') {
        const amount = item.armorAmount ?? 35;
        healthComp.current = Math.min(healthComp.max, healthComp.current + amount);
      } else if (item.kind === 'survivor') {
        const count = item.survivorCount ?? 1;
        state.rescue.carrying = Math.min(SURVIVOR_CAPACITY, state.rescue.carrying + count);
      }
      destroyEntity(item.entity);
    }

    if (state.rescue.carrying > 0 && !state.player.invulnerable) {
      const playerTransform = transforms.get(player)!;
      const dxPad = playerTransform.tx - pad.tx;
      const dyPad = playerTransform.ty - pad.ty;
      const distPad = Math.hypot(dxPad, dyPad);
      if (distPad <= pad.radius + 0.2) {
        const dropped = state.rescue.carrying;
        if (dropped > 0) spawnRescueRunnerAnimation(dropped, isoParams, pad, safeHouse);
        state.rescue.rescued = Math.min(state.rescue.total, state.rescue.rescued + dropped);
        state.rescue.carrying = 0;
      }
    }

    updateRescueRunners(dt);
  };

  return {
    update,
    spawnRescueRunnerAnimation,
    updateRescueRunners,
  };
}
