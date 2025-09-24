import { ComponentStore } from '../../core/ecs/components';
import { EntityRegistry, type Entity } from '../../core/ecs/entities';
import type { Transform } from '../components/Transform';
import type { Physics } from '../components/Physics';
import type { Fuel } from '../components/Fuel';
import type { Sprite } from '../components/Sprite';
import type { Ammo } from '../components/Ammo';
import type { WeaponHolder } from '../components/Weapon';
import type { AAA, SAM, PatrolDrone, ChaserDrone } from '../components/AI';
import type { Health } from '../components/Health';
import type { Collider } from '../components/Collider';
import type { Building } from '../components/Building';
import type { Pickup } from '../components/Pickup';
import type { Speedboat } from '../components/Speedboat';
import type { GameState, EnemyMeta } from '../app/state';
import type { Boss } from '../components/Boss';

export interface LifecycleStores {
  transforms: ComponentStore<Transform>;
  physics: ComponentStore<Physics>;
  fuels: ComponentStore<Fuel>;
  sprites: ComponentStore<Sprite>;
  ammos: ComponentStore<Ammo>;
  weapons: ComponentStore<WeaponHolder>;
  aaas: ComponentStore<AAA>;
  sams: ComponentStore<SAM>;
  patrols: ComponentStore<PatrolDrone>;
  chasers: ComponentStore<ChaserDrone>;
  speedboats: ComponentStore<Speedboat>;
  bosses: ComponentStore<Boss>;
  healths: ComponentStore<Health>;
  colliders: ComponentStore<Collider>;
  buildings: ComponentStore<Building>;
  pickups: ComponentStore<Pickup>;
}

export interface LifecycleDeps {
  entities: EntityRegistry;
  stores: LifecycleStores;
  state: GameState;
}

export function createEntityLifecycle({ entities, stores, state }: LifecycleDeps): {
  destroyEntity: (entity: Entity) => void;
  registerEnemy: (entity: Entity, meta: EnemyMeta) => void;
  clearEnemies: () => void;
} {
  const destroyEntity = (entity: Entity): void => {
    if (state.playerId === entity) return;
    const soundHandle = state.pickupCraneSounds.get(entity);
    if (soundHandle) {
      soundHandle.cancel();
      state.pickupCraneSounds.delete(entity);
    }

    stores.transforms.remove(entity);
    stores.physics.remove(entity);
    stores.fuels.remove(entity);
    stores.sprites.remove(entity);
    stores.ammos.remove(entity);
    stores.weapons.remove(entity);
    stores.aaas.remove(entity);
    stores.sams.remove(entity);
    stores.patrols.remove(entity);
    stores.chasers.remove(entity);
    stores.speedboats.remove(entity);
    stores.bosses.remove(entity);
    stores.healths.remove(entity);
    stores.colliders.remove(entity);
    stores.buildings.remove(entity);
    stores.pickups.remove(entity);

    state.buildingMeta.delete(entity);
    const buildingIndex = state.buildingEntities.indexOf(entity);
    if (buildingIndex !== -1) state.buildingEntities.splice(buildingIndex, 1);
    const pickupIndex = state.pickupEntities.indexOf(entity);
    if (pickupIndex !== -1) state.pickupEntities.splice(pickupIndex, 1);
    const survivorIndex = state.survivorEntities.indexOf(entity);
    if (survivorIndex !== -1) state.survivorEntities.splice(survivorIndex, 1);

    state.enemyMeta.delete(entity);
    state.alienEntities.delete(entity);
    state.wave.enemies.delete(entity);
    entities.destroy(entity);
  };

  const registerEnemy = (entity: Entity, meta: EnemyMeta): void => {
    state.enemyMeta.set(entity, meta);
    if (meta.wave !== undefined) state.wave.enemies.add(entity);
  };

  const clearEnemies = (): void => {
    const ids = Array.from(state.enemyMeta.keys());
    for (let i = 0; i < ids.length; i += 1) destroyEntity(ids[i]!);
    state.enemyMeta.clear();
    state.wave.enemies.clear();
    state.alienEntities.clear();
  };

  return { destroyEntity, registerEnemy, clearEnemies };
}
