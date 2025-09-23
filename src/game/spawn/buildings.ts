import { ComponentStore } from '../../core/ecs/components';
import { EntityRegistry, type Entity } from '../../core/ecs/entities';
import type { Transform } from '../components/Transform';
import type { Building } from '../components/Building';
import type { Health } from '../components/Health';
import type { Collider } from '../components/Collider';
import type { GameState } from '../app/state';
import type { BuildingSite } from '../scenarios/layouts';

export interface BuildingStores {
  transforms: ComponentStore<Transform>;
  buildings: ComponentStore<Building>;
  healths: ComponentStore<Health>;
  colliders: ComponentStore<Collider>;
}

export interface BuildingFactoryDeps {
  entities: EntityRegistry;
  stores: BuildingStores;
  state: GameState;
  destroyEntity: (entity: Entity) => void;
}

export function createBuildingFactory({
  entities,
  stores,
  state,
  destroyEntity,
}: BuildingFactoryDeps): {
  createBuildingEntity: (site: BuildingSite) => Entity;
  spawnBuildings: (sites: BuildingSite[]) => void;
  clearBuildings: () => void;
  spawnAlienStronghold: (
    type: 'AAA' | 'SAM',
    tx: number,
    ty: number,
    spawnAlienUnit: (point: { tx: number; ty: number }) => void,
  ) => void;
} {
  const createBuildingEntity = (site: BuildingSite): Entity => {
    const entity = entities.create();
    stores.transforms.set(entity, { tx: site.tx, ty: site.ty, rot: 0 });
    stores.buildings.set(entity, {
      width: site.width,
      depth: site.depth,
      height: site.height,
      bodyColor: site.bodyColor,
      roofColor: site.roofColor,
      ruinColor: site.ruinColor,
    });
    stores.healths.set(entity, { current: site.health, max: site.health });
    stores.colliders.set(entity, { radius: site.colliderRadius, team: 'enemy' });
    state.buildingMeta.set(entity, {
      score: site.score ?? 0,
      drop: site.drop,
      category: site.category ?? 'civilian',
      triggersAlarm: Boolean(site.triggersAlarm),
    });
    state.buildingEntities.push(entity);
    return entity;
  };

  const spawnBuildings = (sites: BuildingSite[]): void => {
    clearBuildings();
    for (let i = 0; i < sites.length; i += 1) {
      createBuildingEntity(sites[i]!);
    }
  };

  const clearBuildings = (): void => {
    for (let i = state.buildingEntities.length - 1; i >= 0; i -= 1) {
      destroyEntity(state.buildingEntities[i]!);
    }
    state.buildingEntities.length = 0;
  };

  const spawnAlienStronghold = (
    type: 'AAA' | 'SAM',
    tx: number,
    ty: number,
    spawnAlienUnit: (point: { tx: number; ty: number }) => void,
  ): void => {
    const strongholdStructures: BuildingSite[] =
      type === 'AAA'
        ? [
            {
              tx: tx - 0.85,
              ty: ty + 0.55,
              width: 1.15,
              depth: 0.95,
              height: 22,
              health: 85,
              colliderRadius: 0.7,
              bodyColor: '#25143c',
              roofColor: '#6efdd4',
              ruinColor: '#341d4d',
              score: 130,
              category: 'stronghold',
            },
            {
              tx: tx + 0.9,
              ty: ty - 0.45,
              width: 1.05,
              depth: 0.85,
              height: 20,
              health: 80,
              colliderRadius: 0.68,
              bodyColor: '#28163f',
              roofColor: '#63f0c8',
              ruinColor: '#2f1744',
              score: 130,
              category: 'stronghold',
            },
            {
              tx: tx,
              ty: ty + 0.9,
              width: 1.6,
              depth: 0.6,
              height: 16,
              health: 70,
              colliderRadius: 0.65,
              bodyColor: '#1f0f32',
              roofColor: '#8bf9e1',
              ruinColor: '#2a123d',
              score: 110,
              category: 'stronghold',
            },
          ]
        : [
            {
              tx: tx,
              ty: ty - 0.95,
              width: 1.6,
              depth: 1.15,
              height: 30,
              health: 140,
              colliderRadius: 0.88,
              bodyColor: '#1f1d46',
              roofColor: '#7afbe9',
              ruinColor: '#261b3d',
              score: 200,
              category: 'stronghold',
            },
            {
              tx: tx - 1.15,
              ty: ty + 0.55,
              width: 1.1,
              depth: 0.9,
              height: 24,
              health: 90,
              colliderRadius: 0.72,
              bodyColor: '#261548',
              roofColor: '#5cf3db',
              ruinColor: '#2e1a4f',
              score: 150,
              category: 'stronghold',
            },
            {
              tx: tx + 1.1,
              ty: ty + 0.65,
              width: 1.15,
              depth: 0.95,
              height: 24,
              health: 90,
              colliderRadius: 0.74,
              bodyColor: '#2a184d',
              roofColor: '#68f8e1',
              ruinColor: '#311e53',
              score: 150,
              category: 'stronghold',
            },
          ];
    for (let i = 0; i < strongholdStructures.length; i += 1) {
      const site = strongholdStructures[i]!;
      createBuildingEntity({ ...site, triggersAlarm: false });
    }

    const defenders =
      type === 'AAA'
        ? [
            { tx: tx - 1.2, ty: ty + 0.2 },
            { tx: tx + 1, ty: ty - 0.1 },
          ]
        : [
            { tx: tx - 1.25, ty: ty + 0.2 },
            { tx: tx + 1.2, ty: ty + 0.3 },
            { tx: tx + 0.1, ty: ty - 1.2 },
          ];
    for (let i = 0; i < defenders.length; i += 1) {
      spawnAlienUnit(defenders[i]!);
    }
  };

  return { createBuildingEntity, spawnBuildings, clearBuildings, spawnAlienStronghold };
}
