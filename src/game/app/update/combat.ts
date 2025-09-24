import type { ComponentStore } from '../../../core/ecs/components';
import type { Entity } from '../../../core/ecs/entities';
import type { Transform } from '../../components/Transform';
import type { Collider } from '../../components/Collider';
import type { Health } from '../../components/Health';
import type { Physics } from '../../components/Physics';
import type { Building } from '../../components/Building';
import type { GameState } from '../state';
import { PLAYER_RESPAWN_DURATION } from '../constants';
import {
  playMissile,
  playAlienLaser,
  playRocket,
  playHellfire,
  playExplosion,
  type EngineSound,
} from '../../../core/audio/sfx';
import type { AudioBus } from '../../../core/audio/audio';
import type { MusicController } from '../../../core/audio/music';
import type { CameraShake } from '../../../render/camera/shake';
import type { SystemScheduler } from '../../../core/ecs/systems';
import type { ProjectilePool } from '../../systems/Projectile';
import type { DamageSystem } from '../../systems/Damage';
import type { FireEvent } from '../../systems/WeaponFire';
import type { MissionTracker } from '../../missions/tracker';
import type { MissionCoordinator } from '../../missions/coordinator';
import { MISSION_TWO_BASE_TAG, type SurvivorSite } from '../../scenarios/layouts';
import type { UIStore } from '../../../ui/menus/scenes';
import type { ObjectiveState } from '../../missions/types';
import type { Boss } from '../../components/Boss';

const NUKE_PLANT_TIME = 8;

export interface CombatProcessorDeps {
  state: GameState;
  ui: UIStore;
  player: Entity;
  scheduler: SystemScheduler;
  fireEvents: FireEvent[];
  projectilePool: ProjectilePool;
  damage: DamageSystem;
  bus: AudioBus;
  music: MusicController;
  shake: CameraShake;
  transforms: ComponentStore<Transform>;
  colliders: ComponentStore<Collider>;
  physics: ComponentStore<Physics>;
  healths: ComponentStore<Health>;
  buildings: ComponentStore<Building>;
  bosses: ComponentStore<Boss>;
  mission: MissionTracker;
  missionCoordinator: MissionCoordinator;
  spawnSurvivors: (sites: SurvivorSite[]) => void;
  spawnPickupDrop: (tx: number, ty: number, amount: number) => void;
  destroyEntity: (entity: Entity) => void;
  engine: EngineSound;
  spawnAlienUnit: (point: { tx: number; ty: number }) => void;
  spawnFinalBoss: (point: { tx: number; ty: number }) => Entity;
  getRescueCueBuffer?: () => AudioBuffer | null;
  getPlayerDeathBuffer?: () => AudioBuffer | null;
  getBossDefeatBuffer?: () => AudioBuffer | null;
}

export interface CombatProcessor {
  update: (dt: number) => void;
  handleBoatLanding: (entity: Entity) => void;
  spawnExplosion: (tx: number, ty: number, radius?: number, duration?: number) => void;
}

export function createCombatProcessor({
  state,
  ui,
  player,
  scheduler,
  fireEvents,
  projectilePool,
  damage,
  bus,
  music,
  shake,
  transforms,
  colliders,
  physics,
  healths,
  buildings,
  bosses,
  mission,
  missionCoordinator,
  spawnSurvivors,
  spawnPickupDrop,
  destroyEntity,
  engine,
  spawnAlienUnit,
  spawnFinalBoss,
  getRescueCueBuffer = () => null,
  getPlayerDeathBuffer = () => null,
  getBossDefeatBuffer = () => null,
}: CombatProcessorDeps): CombatProcessor {
  const SHIELD_TAG = 'mothership-shield';
  const COAST_BASE_TAG = MISSION_TWO_BASE_TAG;
  const MOTHERSHIP_POWER_IDS = ['core-west', 'core-east', 'core-south'] as const;

  const playBossDefeatCue = (): void => {
    const buffer = getBossDefeatBuffer();
    if (buffer) {
      bus.playSfx(buffer);
    }
  };

  const spawnExplosion = (tx: number, ty: number, radius = 0.9, duration = 0.6): void => {
    state.explosions.push({ tx, ty, age: 0, duration, radius });
  };

  const updateExplosions = (dt: number): void => {
    for (let i = state.explosions.length - 1; i >= 0; i -= 1) {
      const e = state.explosions[i]!;
      e.age += dt;
      if (e.age >= e.duration) state.explosions.splice(i, 1);
    }
  };

  const handleBoatLanding = (entity: Entity): void => {
    const t = transforms.get(entity);
    if (t) spawnExplosion(t.tx, t.ty, 1.1, 0.8);
    playExplosion(bus, 0.8);
    destroyEntity(entity);
    state.boat.boatsEscaped += 1;
    const boatScenario = state.boat.scenario;
    if (
      ui.state === 'in-game' &&
      boatScenario &&
      state.boat.boatsEscaped >= boatScenario.maxEscapes
    ) {
      state.boat.objectiveFailed = true;
      ui.state = 'game-over';
      state.wave.active = false;
      engine.stop();
    }
  };

  const triggerAlienCounterattack = (): void => {
    if (state.flags.aliensTriggered) return;
    state.flags.aliensTriggered = true;
    state.flags.aliensDefeated = false;
    const scenario = missionCoordinator.getScenario();
    for (let i = 0; i < scenario.alienSpawnPoints.length; i += 1) {
      spawnAlienUnit(scenario.alienSpawnPoints[i]!);
    }
  };

  const checkBuildingsForAlienTrigger = (): void => {
    if (state.flags.aliensTriggered) return;
    for (let i = 0; i < state.buildingEntities.length; i += 1) {
      const entity = state.buildingEntities[i]!;
      const meta = state.buildingMeta.get(entity);
      if (!meta || !meta.triggersAlarm) continue;
      const health = healths.get(entity);
      if (health && health.current < health.max) {
        triggerAlienCounterattack();
        break;
      }
    }
  };

  const handlePlayerDeath = (): void => {
    const t = transforms.get(player);
    if (t) spawnExplosion(t.tx, t.ty);
    playExplosion(bus);
    const deathBuffer = getPlayerDeathBuffer();
    if (deathBuffer) bus.playSfx(deathBuffer);
    colliders.remove(player);
    const body = physics.get(player);
    if (body) {
      body.vx = 0;
      body.vy = 0;
      body.ax = 0;
      body.ay = 0;
    }
    state.player.lives -= 1;
    state.player.invulnerable = true;
    state.player.respawnTimer = PLAYER_RESPAWN_DURATION;
    if (state.player.lives <= 0) {
      ui.state = 'game-over';
      state.wave.active = false;
      engine.stop();
    }
  };

  const handleDeaths = (): void => {
    const deaths = damage.consumeDeaths();
    for (let i = 0; i < deaths.length; i += 1) {
      const entity = deaths[i]!;
      if (entity === player) {
        handlePlayerDeath();
        continue;
      }
      const enemyMeta = state.enemyMeta.get(entity);
      if (enemyMeta) {
        const t = transforms.get(entity);
        if (t) spawnExplosion(t.tx, t.ty);
        playExplosion(bus);
        if (enemyMeta.kind === 'boss') {
          state.finalBoss.phase = 'defeated';
          state.finalBoss.timer = 0;
          state.finalBoss.entity = null;
          state.finalBoss.health = 0;
          state.finalBoss.enraged = false;
          if (state.finalBoss.objectiveId) {
            const objective = mission.state.objectives.find(
              (o) => o.id === state.finalBoss.objectiveId,
            );
            if (objective) objective.complete = true;
          }
          mission.state.complete = true;
        }
        state.stats.score += enemyMeta.score;
        destroyEntity(entity);
        continue;
      }
      const buildingComp = buildings.get(entity);
      if (buildingComp) {
        const t = transforms.get(entity);
        if (t) {
          spawnExplosion(t.tx, t.ty);
          const seed = entity * 1103515245 + 12345;
          state.rubble.push({
            tx: t.tx,
            ty: t.ty,
            width: buildingComp.width,
            depth: buildingComp.depth,
            seed,
          });
          if (state.rubble.length > 120) state.rubble.splice(0, state.rubble.length - 120);
        }
        playExplosion(bus);
        const meta = state.buildingMeta.get(entity);
        if (meta) {
          if (meta.score) state.stats.score += meta.score;
          if (t && meta.drop) {
            spawnPickupDrop(t.tx, t.ty, meta.drop.amount);
          }
        }
        destroyEntity(entity);
        continue;
      }
      destroyEntity(entity);
    }
  };

  const removeTaggedBuildings = (tag: string): boolean => {
    let removed = false;
    for (let i = state.buildingEntities.length - 1; i >= 0; i -= 1) {
      const entity = state.buildingEntities[i]!;
      const meta = state.buildingMeta.get(entity);
      if (!meta || meta.tag !== tag) continue;
      const transform = transforms.get(entity);
      if (transform) {
        spawnExplosion(transform.tx, transform.ty, 1.2, 0.9);
        const building = buildings.get(entity);
        if (building) {
          const seed = entity * 1103515245 + 12345;
          state.rubble.push({
            tx: transform.tx,
            ty: transform.ty,
            width: building.width,
            depth: building.depth,
            seed,
          });
          if (state.rubble.length > 120) state.rubble.splice(0, state.rubble.length - 120);
        }
      }
      destroyEntity(entity);
      removed = true;
    }
    return removed;
  };

  const updateMothershipShield = (): void => {
    if (mission.state.def.id !== 'm03') return;
    if (!state.flags.mothershipShieldActive) return;
    const allOffline = MOTHERSHIP_POWER_IDS.every((id) => {
      const objective = mission.state.objectives.find((o) => o.id === id);
      return Boolean(objective && objective.complete);
    });
    if (!allOffline) return;
    state.flags.mothershipShieldActive = false;
    state.flags.mothershipBreachOpen = true;
    const removed = removeTaggedBuildings(SHIELD_TAG);
    if (removed) {
      playExplosion(bus, 0.6);
    }
  };

  const updateWave = (dt: number): void => {
    if (ui.state !== 'in-game') return;
    const scenario = missionCoordinator.getScenario();
    if (state.wave.active) {
      state.wave.timeInWave += dt;
      if (state.wave.enemies.size === 0) {
        state.wave.active = false;
        const cooldown = scenario.waveCooldown
          ? scenario.waveCooldown(state.wave.index)
          : Number.POSITIVE_INFINITY;
        state.wave.countdown = cooldown;
        if (
          scenario.boatScenario &&
          state.wave.index >= scenario.boatScenario.waves.length &&
          !state.boat.objectiveFailed
        ) {
          state.boat.objectiveComplete = true;
        }
      }
    } else if (scenario.waveSpawner) {
      if (!Number.isFinite(state.wave.countdown)) return;
      state.wave.countdown -= dt;
      if (state.wave.countdown <= 0) {
        state.wave.index += 1;
        const spawned = scenario.waveSpawner(state.wave.index);
        if (spawned) {
          state.wave.active = true;
          state.wave.timeInWave = 0;
        } else {
          state.wave.countdown = Number.POSITIVE_INFINITY;
        }
      }
    }
  };

  const updateHivePlanting = (dt: number): void => {
    const missionState = mission.state;
    const missionId = missionState.def.id;
    if (missionId !== 'm04') {
      if (!missionState.complete) {
        state.hive.planting = false;
        if (!state.hive.armed) state.hive.progress = 0;
      }
      return;
    }

    const objective = missionState.objectives.find((o) => o.id === 'plant-nuke');
    if (!objective) return;
    if (objective.complete) {
      state.hive.planting = false;
      state.hive.progress = state.hive.target > 0 ? state.hive.target : NUKE_PLANT_TIME;
      state.hive.armed = true;
      return;
    }

    const prereqsMet = !objective.requires
      ? true
      : objective.requires.every((id) => {
          const required = missionState.objectives.find((o) => o.id === id);
          return Boolean(required && required.complete);
        });
    if (!prereqsMet) {
      state.hive.planting = false;
      state.hive.progress = 0;
      state.hive.armed = false;
      return;
    }

    if (state.hive.target <= 0) state.hive.target = NUKE_PLANT_TIME;

    const transform = transforms.get(player);
    if (!transform) return;
    const dx = transform.tx - objective.at.tx;
    const dy = transform.ty - objective.at.ty;
    const dist = Math.hypot(dx, dy);
    if (dist <= objective.radiusTiles) {
      state.hive.planting = true;
      state.hive.progress = Math.min(state.hive.target, state.hive.progress + dt);
      if (state.hive.progress >= state.hive.target) {
        state.hive.armed = true;
      }
    } else {
      state.hive.planting = false;
      state.hive.progress = Math.max(0, state.hive.progress - dt * 0.75);
      if (state.hive.progress < state.hive.target) {
        state.hive.armed = false;
      }
    }
  };

  const ensureFinalBossObjective = (): void => {
    if (state.finalBoss.objectiveId) return;
    const existing = mission.state.objectives.find((o) => o.id === 'final-boss');
    if (existing) {
      existing.complete = false;
      state.finalBoss.objectiveId = existing.id;
      mission.state.complete = false;
      return;
    }
    const bossObjective: ObjectiveState = {
      id: 'final-boss',
      type: 'custom',
      name: 'Destroy Vorusk the Neurofurnace',
      at: { tx: 32, ty: 21 },
      radiusTiles: 4.5,
      requires: ['extract'],
      complete: false,
    };
    mission.state.objectives.push(bossObjective);
    state.finalBoss.objectiveId = bossObjective.id;
    mission.state.complete = false;
  };

  const beginFinalBossCinematic = (): void => {
    ensureFinalBossObjective();
    state.finalBoss.phase = 'cinematic';
    state.finalBoss.timer = 0;
    state.finalBoss.entity = null;
    state.finalBoss.name = 'Vorusk the Neurofurnace';
    state.finalBoss.health = 0;
    state.finalBoss.healthMax = 0;
    state.finalBoss.enraged = false;
    state.wave.active = false;
    state.wave.countdown = Number.POSITIVE_INFINITY;
    state.wave.enemies.clear();
    ui.state = 'nuke-cinematic';
  };

  const updateFinalBossPhase = (dt: number): void => {
    if (mission.state.def.id !== 'm04') return;
    const boss = state.finalBoss;

    if (boss.phase === 'inactive') {
      if (mission.state.complete && !boss.objectiveId) {
        beginFinalBossCinematic();
      }
      return;
    }

    if (boss.phase === 'cinematic') {
      boss.timer += dt;
      mission.state.complete = false;
      if (ui.state === 'nuke-cinematic') {
        return;
      }
      if (ui.state !== 'in-game') {
        ui.state = 'in-game';
      }
      boss.phase = 'spawning';
      boss.timer = 0;
    }

    if (boss.phase === 'spawning') {
      const spawnPoint = { tx: 32, ty: 21 };
      const entity = spawnFinalBoss(spawnPoint);
      boss.entity = entity;
      boss.name = 'Vorusk the Neurofurnace';
      const bossHealth = healths.get(entity);
      boss.health = bossHealth?.current ?? 0;
      boss.healthMax = bossHealth?.max ?? boss.health;
      boss.phase = 'active';
      void music.play('boss');
      mission.state.complete = false;
      return;
    }

    if (boss.entity) {
      const bossHealth = healths.get(boss.entity);
      const bossComp = bosses.get(boss.entity);
      if (bossHealth) {
        boss.health = bossHealth.current;
        boss.healthMax = bossHealth.max;
      }
      boss.enraged = bossComp?.enraged ?? boss.enraged;
      mission.state.complete = false;
      if (!bossHealth || bossHealth.current <= 0) {
        boss.phase = 'defeated';
        boss.timer = 0;
        boss.entity = null;
        boss.health = 0;
        boss.enraged = false;
        if (boss.objectiveId) {
          const objective = mission.state.objectives.find((o) => o.id === boss.objectiveId);
          if (objective) objective.complete = true;
        }
        playBossDefeatCue();
        mission.state.complete = true;
      }
    } else if (boss.phase === 'active') {
      boss.phase = 'defeated';
      playBossDefeatCue();
      mission.state.complete = true;
    }
  };

  const update = (dt: number): void => {
    const scenario = missionCoordinator.getScenario();
    scheduler.update(dt);

    for (let i = 0; i < fireEvents.length; i += 1) {
      const ev = fireEvents[i]!;
      if (ev.kind === 'missile') {
        playMissile(bus);
        const dirLen = Math.hypot(ev.dx, ev.dy) || 1;
        const dirX = ev.dx / dirLen;
        const dirY = ev.dy / dirLen;
        const speedM = ev.speed ?? 22;
        const launchOffset = ev.launchOffset ?? 0.48;
        const spawnX = ev.sx + dirX * launchOffset;
        const spawnY = ev.sy + dirY * launchOffset;
        projectilePool.spawn({
          kind: 'missile',
          faction: ev.faction,
          x: spawnX,
          y: spawnY,
          vx: dirX * speedM,
          vy: dirY * speedM,
          ttl: ev.ttl ?? 0.6,
          radius: ev.radius ?? 0.08,
          damage: { amount: ev.damage ?? 10, radius: ev.damageRadius ?? 0.12 },
        });
      } else if (ev.kind === 'laser') {
        playAlienLaser(bus);
        const dirLen = Math.hypot(ev.dx, ev.dy) || 1;
        const dirX = ev.dx / dirLen;
        const dirY = ev.dy / dirLen;
        const speedL = ev.speed ?? 30;
        const launchOffset = ev.launchOffset ?? 0.3;
        const spawnX = ev.sx + dirX * launchOffset;
        const spawnY = ev.sy + dirY * launchOffset;
        projectilePool.spawn({
          kind: 'laser',
          faction: ev.faction,
          x: spawnX,
          y: spawnY,
          vx: dirX * speedL,
          vy: dirY * speedL,
          ttl: ev.ttl ?? 0.45,
          radius: ev.radius ?? 0.04,
          damage: { amount: ev.damage ?? 6, radius: ev.damageRadius ?? 0.08 },
        });
      } else if (ev.kind === 'rocket') {
        playRocket(bus);
        projectilePool.spawn({
          kind: 'rocket',
          faction: ev.faction,
          x: ev.x,
          y: ev.y,
          vx: ev.vx,
          vy: ev.vy,
          ttl: ev.ttl ?? 5.2,
          radius: ev.radius ?? 0.22,
          damage: { amount: ev.damage ?? 16, radius: ev.damageRadius ?? 0.9 },
        });
      } else if (ev.kind === 'hellfire') {
        playHellfire(bus);
        const velLen = Math.hypot(ev.vx, ev.vy) || 1;
        const dirX = ev.vx / velLen;
        const dirY = ev.vy / velLen;
        const launchOffset = ev.launchOffset ?? 0.92;
        const speedH = ev.speed ?? velLen;
        const spawnX = ev.x + dirX * launchOffset;
        const spawnY = ev.y + dirY * launchOffset;
        projectilePool.spawn({
          kind: 'hellfire',
          faction: ev.faction,
          x: spawnX,
          y: spawnY,
          vx: dirX * speedH,
          vy: dirY * speedH,
          ttl: ev.ttl ?? 3.2,
          radius: ev.radius ?? 0.3,
          seek: { targetX: ev.targetX, targetY: ev.targetY, turnRate: Math.PI * 0.8 },
          damage: { amount: ev.damage ?? 36, radius: ev.damageRadius ?? 1.9 },
        });
      }
    }
    fireEvents.length = 0;

    projectilePool.update(dt, colliders, colliders, transforms, (hit) => {
      damage.queue(hit);
      const boomRadius = Math.max(0.2, hit.radius * 1.45);
      const boomDuration = 0.32 + hit.radius * 0.38;
      spawnExplosion(hit.x, hit.y, boomRadius, boomDuration);
      playExplosion(bus, hit.radius);
      if (ui.settings.screenShake) shake.trigger(8, 0.25);
    });

    damage.update();
    checkBuildingsForAlienTrigger();
    handleDeaths();
    updateMothershipShield();

    if (!state.flags.campusLeveled) {
      let campusRemaining = 0;
      state.buildingMeta.forEach((meta) => {
        if (meta.category === 'campus') campusRemaining += 1;
      });
      if (campusRemaining === 0) state.flags.campusLeveled = true;
    }

    if (mission.state.def.id === 'm02' && !state.flags.coastBaseLeveled) {
      let baseRemaining = 0;
      state.buildingMeta.forEach((meta) => {
        if (meta.tag === COAST_BASE_TAG) baseRemaining += 1;
      });
      if (baseRemaining === 0) state.flags.coastBaseLeveled = true;
    }

    if (
      state.flags.aliensTriggered &&
      !state.flags.aliensDefeated &&
      state.alienEntities.size === 0
    ) {
      state.flags.aliensDefeated = true;
    }

    const missionId = mission.state.def.id;
    const rescueReady =
      missionId === 'm02'
        ? state.flags.coastBaseLeveled && state.flags.aliensDefeated
        : state.flags.campusLeveled && state.flags.aliensDefeated;

    if (!state.rescue.survivorsSpawned && rescueReady) {
      const totalSurvivors = scenario.survivorSites.reduce(
        (sum, site) => sum + Math.max(0, Math.round(site.count)),
        0,
      );
      state.rescue.total = totalSurvivors;

      if (totalSurvivors > 0) {
        spawnSurvivors(scenario.survivorSites);
        const rescueCue = getRescueCueBuffer();
        if (rescueCue) bus.playSfx(rescueCue);
      }

      state.rescue.survivorsSpawned = true;
    }

    updateHivePlanting(dt);

    mission.update();
    updateFinalBossPhase(dt);
    if (mission.state.complete && ui.state === 'in-game') {
      void music.play('win');
      if (mission.state.def.id === 'm04' && state.finalBoss.phase === 'defeated') {
        ui.state = 'final-win';
      } else {
        ui.state = 'win';
      }
      missionCoordinator.onMissionWin();
    }

    updateWave(dt);
    updateExplosions(dt);
  };

  return {
    update,
    handleBoatLanding,
    spawnExplosion,
  };
}
