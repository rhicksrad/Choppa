import { ComponentStore } from '../../core/ecs/components';
import { EntityRegistry, type Entity } from '../../core/ecs/entities';
import type { Transform } from '../components/Transform';
import type { Pickup } from '../components/Pickup';
import type { GameState } from '../app/state';
import { startPickupCrane, type PickupCraneSoundHandle } from '../../core/audio/sfx';
import type { AudioBus } from '../../core/audio/audio';
import type { PickupSite, SurvivorSite } from '../scenarios/layouts';

export interface PickupStores {
  transforms: ComponentStore<Transform>;
  pickups: ComponentStore<Pickup>;
}

export interface PickupFactoryDeps {
  entities: EntityRegistry;
  stores: PickupStores;
  state: GameState;
  bus: AudioBus;
  destroyEntity: (entity: Entity) => void;
}

export function createPickupFactory({
  entities,
  stores,
  state,
  bus,
  destroyEntity,
}: PickupFactoryDeps): {
  spawnPickupEntity: (site: PickupSite) => Entity;
  spawnPickups: (sites: PickupSite[]) => void;
  spawnSurvivors: (sites: SurvivorSite[]) => void;
  clearPickups: () => void;
  beginPickupCraneSound: (entity: Entity, pickup: Pickup) => void;
  cancelPickupCraneSound: (entity: Entity) => void;
  completePickupCraneSound: (entity: Entity) => void;
} {
  const beginPickupCraneSound = (entity: Entity, pickup: Pickup): void => {
    if (state.pickupCraneSounds.has(entity)) return;
    const handle = startPickupCrane(bus, pickup.duration);
    state.pickupCraneSounds.set(entity, handle);
  };

  const stopCraneHandle = (
    entity: Entity,
    action: (handle: PickupCraneSoundHandle) => void,
  ): void => {
    const handle = state.pickupCraneSounds.get(entity);
    if (!handle) return;
    action(handle);
    state.pickupCraneSounds.delete(entity);
  };

  const cancelPickupCraneSound = (entity: Entity): void => {
    stopCraneHandle(entity, (handle) => handle.cancel());
  };

  const completePickupCraneSound = (entity: Entity): void => {
    stopCraneHandle(entity, (handle) => handle.complete());
  };

  const spawnPickupEntity = (site: PickupSite): Entity => {
    const entity = entities.create();
    stores.transforms.set(entity, { tx: site.tx, ty: site.ty, rot: 0 });
    stores.pickups.set(entity, {
      kind: site.kind,
      radius: site.radius ?? 0.9,
      duration: site.duration ?? 1.3,
      fuelAmount: site.kind === 'fuel' ? (site.fuelAmount ?? 50) : undefined,
      ammo:
        site.kind === 'ammo'
          ? {
              missiles: site.ammo?.missiles ?? 80,
              rockets: site.ammo?.rockets ?? 3,
              hellfires: site.ammo?.hellfires ?? 0,
            }
          : undefined,
      armorAmount: site.kind === 'armor' ? (site.armorAmount ?? 35) : undefined,
      collectingBy: null,
      progress: 0,
    });
    state.pickupEntities.push(entity);
    return entity;
  };

  const spawnPickups = (sites: PickupSite[]): void => {
    clearPickups();
    for (let i = 0; i < sites.length; i += 1) {
      spawnPickupEntity(sites[i]!);
    }
  };

  const spawnSurvivors = (sites: SurvivorSite[]): void => {
    if (state.rescue.survivorsSpawned) return;
    state.rescue.survivorsSpawned = true;
    for (let i = 0; i < sites.length; i += 1) {
      const site = sites[i]!;
      const desiredCount = Math.max(0, Math.round(site.count));
      if (desiredCount === 0) continue;
      const spacing = Math.min(0.42, (site.radius ?? 0.9) * 0.45);
      const perRow = Math.max(1, Math.ceil(Math.sqrt(desiredCount)));
      const totalRows = Math.max(1, Math.ceil(desiredCount / perRow));
      for (let n = 0; n < desiredCount; n += 1) {
        const row = Math.floor(n / perRow);
        let columnsInRow = perRow;
        if (row === totalRows - 1) {
          columnsInRow = Math.min(perRow, desiredCount - row * perRow);
        }
        const columnIndex = Math.min(n % perRow, columnsInRow - 1);
        const rowCenter = (totalRows - 1) / 2;
        const columnCenter = (columnsInRow - 1) / 2;
        const baseOffsetX = (columnIndex - columnCenter) * spacing;
        const baseOffsetY = (row - rowCenter) * spacing * 0.85;
        const jitterSeed = site.tx * 17.23 + site.ty * 11.17 + n * 5.91;
        const jitterStrength = desiredCount > 1 ? spacing * 0.18 : 0;
        const jitterX = Math.sin(jitterSeed) * jitterStrength;
        const jitterY = Math.cos(jitterSeed) * jitterStrength * 0.9;
        const entity = entities.create();
        stores.transforms.set(entity, {
          tx: site.tx + baseOffsetX + jitterX,
          ty: site.ty + baseOffsetY + jitterY,
          rot: 0,
        });
        stores.pickups.set(entity, {
          kind: 'survivor',
          radius: site.radius ?? 0.9,
          duration: site.duration ?? 1.6,
          fuelAmount: undefined,
          ammo: undefined,
          survivorCount: 1,
          collectingBy: null,
          progress: 0,
        });
        state.pickupEntities.push(entity);
        state.survivorEntities.push(entity);
      }
    }
  };

  const clearPickups = (): void => {
    for (let i = state.pickupEntities.length - 1; i >= 0; i -= 1) {
      destroyEntity(state.pickupEntities[i]!);
    }
    state.pickupEntities.length = 0;
    state.survivorEntities.length = 0;
  };

  return {
    spawnPickupEntity,
    spawnPickups,
    spawnSurvivors,
    clearPickups,
    beginPickupCraneSound,
    cancelPickupCraneSound,
    completePickupCraneSound,
  };
}
