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
      const entity = entities.create();
      stores.transforms.set(entity, { tx: site.tx, ty: site.ty, rot: 0 });
      stores.pickups.set(entity, {
        kind: 'survivor',
        radius: site.radius ?? 0.9,
        duration: site.duration ?? 1.6,
        fuelAmount: undefined,
        ammo: undefined,
        survivorCount: site.count,
        collectingBy: null,
        progress: 0,
      });
      state.pickupEntities.push(entity);
      state.survivorEntities.push(entity);
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
