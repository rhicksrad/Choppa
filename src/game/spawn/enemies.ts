import { ComponentStore } from '../../core/ecs/components';
import { EntityRegistry, type Entity } from '../../core/ecs/entities';
import type { Transform } from '../components/Transform';
import type { Physics } from '../components/Physics';
import type { Health } from '../components/Health';
import type { Collider } from '../components/Collider';
import type { AAA, SAM, PatrolDrone, ChaserDrone } from '../components/AI';
import type { Speedboat } from '../components/Speedboat';
import type { GameState, EnemyMeta } from '../app/state';
import { RNG } from '../../core/util/rng';
import type { MissionDef } from '../missions/types';
import type { BoatLane, BoatWave } from '../scenarios/layouts';

export interface EnemyStores {
  transforms: ComponentStore<Transform>;
  physics: ComponentStore<Physics>;
  healths: ComponentStore<Health>;
  colliders: ComponentStore<Collider>;
  aaas: ComponentStore<AAA>;
  sams: ComponentStore<SAM>;
  patrols: ComponentStore<PatrolDrone>;
  chasers: ComponentStore<ChaserDrone>;
  speedboats: ComponentStore<Speedboat>;
}

export interface EnemyFactoryDeps {
  entities: EntityRegistry;
  stores: EnemyStores;
  rng: RNG;
  state: GameState;
  registerEnemy: (entity: Entity, meta: EnemyMeta) => void;
}

export interface MissionSpawnConfig {
  mission: MissionDef;
  spawnExtraEnemies?: () => void;
}

export function createEnemyFactory({
  entities,
  stores,
  rng,
  state,
  registerEnemy,
}: EnemyFactoryDeps): {
  spawnMissionEnemies: (
    config: MissionSpawnConfig,
    spawnAlienStronghold: (type: 'AAA' | 'SAM', tx: number, ty: number) => void,
  ) => void;
  spawnCoastGuard: (point: { tx: number; ty: number }, leashRange: number) => void;
  spawnShorePatrol: (route: { tx: number; ty: number; axis: 'x' | 'y'; range: number }) => void;
  spawnPatrolEnemy: (point: { tx: number; ty: number }, wave: number, axis: 'x' | 'y') => Entity;
  spawnChaserEnemy: (point: { tx: number; ty: number }, wave: number) => Entity;
  spawnAlienUnit: (point: { tx: number; ty: number }) => void;
  spawnSpeedboat: (lane: BoatLane, wave: number) => void;
  spawnDefaultWave: (waveIndex: number, spawnPoints: Array<{ tx: number; ty: number }>) => boolean;
  spawnBoatWave: (
    waveIndex: number,
    boatScenario: { lanes: BoatLane[]; waves: BoatWave[] },
  ) => boolean;
} {
  const spawnCoastGuard = (point: { tx: number; ty: number }, leashRange: number): void => {
    const entity = entities.create();
    stores.transforms.set(entity, { tx: point.tx, ty: point.ty, rot: 0 });
    stores.physics.set(entity, {
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      drag: 0.72,
      maxSpeed: 3.4,
      turnRate: Math.PI * 1.5,
    });
    stores.healths.set(entity, { current: 38, max: 38 });
    stores.colliders.set(entity, { radius: 0.35, team: 'enemy' });
    stores.chasers.set(entity, {
      speed: 3.1,
      acceleration: 3.5,
      fireRange: 6.5,
      fireInterval: 1.05,
      cooldown: 0,
      spread: 0.2,
      guard: {
        homeX: point.tx,
        homeY: point.ty,
        holdRadius: 0.6,
        aggroRange: 6.8,
        leashRange,
        alerted: false,
      },
    });
    registerEnemy(entity, { kind: 'chaser', score: 250 });
  };

  const spawnShorePatrol = (route: {
    tx: number;
    ty: number;
    axis: 'x' | 'y';
    range: number;
  }): void => {
    const entity = entities.create();
    stores.transforms.set(entity, { tx: route.tx, ty: route.ty, rot: 0 });
    stores.physics.set(entity, {
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      drag: 0.86,
      maxSpeed: 2.3,
      turnRate: Math.PI,
    });
    stores.healths.set(entity, { current: 28, max: 28 });
    stores.colliders.set(entity, { radius: 0.38, team: 'enemy' });
    stores.patrols.set(entity, {
      axis: route.axis,
      originX: route.tx,
      originY: route.ty,
      range: route.range,
      speed: 2.1,
      direction: rng.float01() > 0.5 ? 1 : -1,
      fireRange: 6.4,
      fireInterval: 1.15,
      cooldown: 0,
    });
    registerEnemy(entity, { kind: 'patrol', score: 165 });
  };

  const spawnPatrolEnemy = (
    point: { tx: number; ty: number },
    wave: number,
    axis: 'x' | 'y',
  ): Entity => {
    const entity = entities.create();
    stores.transforms.set(entity, { tx: point.tx, ty: point.ty, rot: 0 });
    stores.physics.set(entity, {
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      drag: 0.9,
      maxSpeed: 2.2 + wave * 0.1,
      turnRate: Math.PI,
    });
    stores.healths.set(entity, { current: 22 + wave * 3, max: 22 + wave * 3 });
    stores.colliders.set(entity, { radius: 0.4, team: 'enemy' });
    stores.patrols.set(entity, {
      axis,
      originX: point.tx,
      originY: point.ty,
      range: 2.5 + Math.min(4, wave * 0.6),
      speed: 1.8 + wave * 0.2,
      direction: rng.float01() > 0.5 ? 1 : -1,
      fireRange: 6.5,
      fireInterval: Math.max(0.9, 1.4 - wave * 0.1),
      cooldown: 0,
    });
    registerEnemy(entity, { kind: 'patrol', score: 125 + wave * 15, wave });
    return entity;
  };

  const spawnChaserEnemy = (point: { tx: number; ty: number }, wave: number): Entity => {
    const entity = entities.create();
    stores.transforms.set(entity, { tx: point.tx, ty: point.ty, rot: 0 });
    stores.physics.set(entity, {
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      drag: 0.7,
      maxSpeed: 3.2 + wave * 0.25,
      turnRate: Math.PI * 1.4,
    });
    stores.healths.set(entity, { current: 26 + wave * 4, max: 26 + wave * 4 });
    stores.colliders.set(entity, { radius: 0.35, team: 'enemy' });
    stores.chasers.set(entity, {
      speed: 2.6 + wave * 0.25,
      acceleration: 3.2,
      fireRange: 6,
      fireInterval: Math.max(0.8, 1.3 - wave * 0.1),
      cooldown: 0,
      spread: 0.18,
    });
    registerEnemy(entity, { kind: 'chaser', score: 220 + wave * 20, wave });
    return entity;
  };

  const spawnAlienUnit = (point: { tx: number; ty: number }): void => {
    const entity = entities.create();
    stores.transforms.set(entity, { tx: point.tx, ty: point.ty, rot: 0 });
    stores.physics.set(entity, {
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      drag: 0.7,
      maxSpeed: 3.4,
      turnRate: Math.PI * 1.5,
    });
    stores.healths.set(entity, { current: 36, max: 36 });
    stores.colliders.set(entity, { radius: 0.35, team: 'enemy' });
    stores.chasers.set(entity, {
      speed: 3.1,
      acceleration: 3.6,
      fireRange: 7.2,
      fireInterval: 0.95,
      cooldown: 0,
      spread: 0.16,
      guard: {
        homeX: point.tx,
        homeY: point.ty,
        holdRadius: 0.45,
        aggroRange: 6.8,
        leashRange: 10.5,
        alerted: false,
      },
      weapon: {
        kind: 'laser',
        speed: 34,
        ttl: 0.55,
        radius: 0.05,
        damage: 7,
        damageRadius: 0.1,
        launchOffset: 0.34,
      },
    });
    registerEnemy(entity, { kind: 'chaser', score: 260 });
    state.alienEntities.add(entity);
  };

  const spawnSpeedboat = (lane: BoatLane, wave: number): void => {
    const entity = entities.create();
    const entryJitter = (rng.float01() - 0.5) * 0.6;
    const entryJitterY = (rng.float01() - 0.5) * 0.4;
    const cruiseSpeed = 2.4 + wave * 0.18;
    stores.transforms.set(entity, {
      tx: lane.entry.tx + entryJitter,
      ty: lane.entry.ty + entryJitterY,
      rot: 0,
    });
    stores.physics.set(entity, {
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      drag: 0.78,
      maxSpeed: cruiseSpeed + 0.4,
      turnRate: Math.PI,
    });
    stores.healths.set(entity, { current: 24 + wave * 4, max: 24 + wave * 4 });
    stores.colliders.set(entity, { radius: 0.4, team: 'enemy' });
    stores.speedboats.set(entity, {
      targetX: lane.target.tx + (rng.float01() - 0.5) * 0.5,
      targetY: lane.target.ty + (rng.float01() - 0.5) * 0.5,
      speed: cruiseSpeed,
      acceleration: 2.6,
      fireRange: 6.2,
      fireInterval: Math.max(0.95, 1.3 - wave * 0.08),
      cooldown: 0,
      arrivalRadius: 0.6,
      activationRange: 7.5,
      activated: false,
      squadId: lane.squadId,
      weapon: {
        kind: 'laser',
        speed: 32,
        ttl: 0.6,
        radius: 0.05,
        damage: 6,
        damageRadius: 0.12,
        launchOffset: 0.42,
        spread: 0.12,
      },
    });
    registerEnemy(entity, { kind: 'speedboat', score: 220 + wave * 25, wave });
  };

  const spawnMissionEnemies = (
    config: MissionSpawnConfig,
    spawnAlienStronghold: (type: 'AAA' | 'SAM', tx: number, ty: number) => void,
  ): void => {
    const spawns = config.mission.enemySpawns ?? [];
    for (let i = 0; i < spawns.length; i += 1) {
      const spawn = spawns[i]!;
      const entity = entities.create();
      stores.transforms.set(entity, { tx: spawn.at.tx, ty: spawn.at.ty, rot: 0 });
      stores.healths.set(entity, { current: 30, max: 30 });
      stores.colliders.set(entity, { radius: 0.5, team: 'enemy' });
      if (spawn.type === 'AAA') {
        stores.aaas.set(entity, {
          range: 8,
          cooldown: 0,
          fireInterval: 0.6,
          projectileSpeed: 12,
          spread: 0.06,
        });
        registerEnemy(entity, { kind: 'aaa', score: 150 });
        spawnAlienStronghold('AAA', spawn.at.tx, spawn.at.ty);
      } else {
        stores.sams.set(entity, {
          range: 12,
          lockTime: 0.8,
          cooldown: 0,
          fireInterval: 2.5,
          turnRate: Math.PI * 0.7,
          missileSpeed: 6,
          lockProgress: 0,
        });
        registerEnemy(entity, { kind: 'sam', score: 200 });
        spawnAlienStronghold('SAM', spawn.at.tx, spawn.at.ty);
      }
    }
    if (config.spawnExtraEnemies) config.spawnExtraEnemies();
  };

  const spawnDefaultWave = (
    waveIndex: number,
    spawnPoints: Array<{ tx: number; ty: number }>,
  ): boolean => {
    if (spawnPoints.length === 0) return false;
    state.wave.enemies.clear();
    const patrolCount = Math.min(spawnPoints.length, 2 + waveIndex);
    const chaserCount = Math.min(spawnPoints.length, Math.max(0, Math.floor(waveIndex / 2)));
    for (let i = 0; i < patrolCount; i += 1) {
      const point = spawnPoints[i % spawnPoints.length]!;
      const axis: 'x' | 'y' = i % 2 === 0 ? 'x' : 'y';
      spawnPatrolEnemy(point, waveIndex, axis);
    }
    for (let i = 0; i < chaserCount; i += 1) {
      const point = spawnPoints[(i + patrolCount) % spawnPoints.length]!;
      spawnChaserEnemy(point, waveIndex);
    }
    return true;
  };

  const spawnBoatWave = (
    waveIndex: number,
    boatScenario: { lanes: BoatLane[]; waves: BoatWave[] },
  ): boolean => {
    if (!boatScenario || boatScenario.lanes.length === 0) return false;
    state.wave.enemies.clear();
    const waveDef = boatScenario.waves[waveIndex - 1];
    if (!waveDef) return false;
    const laneOffset = Math.floor(rng.range(0, boatScenario.lanes.length));
    for (let i = 0; i < waveDef.count; i += 1) {
      const lane = boatScenario.lanes[(i + laneOffset) % boatScenario.lanes.length]!;
      spawnSpeedboat(lane, waveIndex);
    }
    return waveDef.count > 0;
  };

  return {
    spawnMissionEnemies,
    spawnCoastGuard,
    spawnShorePatrol,
    spawnPatrolEnemy,
    spawnChaserEnemy,
    spawnAlienUnit,
    spawnSpeedboat,
    spawnDefaultWave,
    spawnBoatWave,
  };
}
