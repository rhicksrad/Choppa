import type { ComponentStore } from '../../../core/ecs/components';
import type { Entity } from '../../../core/ecs/entities';
import type { Transform } from '../../components/Transform';
import type { Collider } from '../../components/Collider';
import type { Health } from '../../components/Health';
import type { Physics } from '../../components/Physics';
import type { Building } from '../../components/Building';
import type { GameState } from '../state';
import {
  playMissile,
  playAlienLaser,
  playRocket,
  playHellfire,
  playExplosion,
  type EngineSound,
} from '../../../core/audio/sfx';
import type { AudioBus } from '../../../core/audio/audio';
import type { CameraShake } from '../../../render/camera/shake';
import type { SystemScheduler } from '../../../core/ecs/systems';
import type { ProjectilePool } from '../../systems/Projectile';
import type { DamageSystem } from '../../systems/Damage';
import type { FireEvent } from '../../systems/WeaponFire';
import type { MissionTracker } from '../../missions/tracker';
import type { MissionCoordinator } from '../../missions/coordinator';
import type { SurvivorSite } from '../../scenarios/layouts';
import type { UIStore } from '../../../ui/menus/scenes';

export interface CombatProcessorDeps {
  state: GameState;
  ui: UIStore;
  player: Entity;
  scheduler: SystemScheduler;
  fireEvents: FireEvent[];
  projectilePool: ProjectilePool;
  damage: DamageSystem;
  bus: AudioBus;
  shake: CameraShake;
  transforms: ComponentStore<Transform>;
  colliders: ComponentStore<Collider>;
  physics: ComponentStore<Physics>;
  healths: ComponentStore<Health>;
  buildings: ComponentStore<Building>;
  mission: MissionTracker;
  missionCoordinator: MissionCoordinator;
  spawnSurvivors: (sites: SurvivorSite[]) => void;
  spawnPickupDrop: (tx: number, ty: number, amount: number) => void;
  destroyEntity: (entity: Entity) => void;
  engine: EngineSound;
  spawnAlienUnit: (point: { tx: number; ty: number }) => void;
  getRescueCueBuffer?: () => AudioBuffer | null;
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
  shake,
  transforms,
  colliders,
  physics,
  healths,
  buildings,
  mission,
  missionCoordinator,
  spawnSurvivors,
  spawnPickupDrop,
  destroyEntity,
  engine,
  spawnAlienUnit,
  getRescueCueBuffer = () => null,
}: CombatProcessorDeps): CombatProcessor {
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
    state.player.respawnTimer = 2.5;
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
        state.stats.score += enemyMeta.score;
        destroyEntity(entity);
        continue;
      }
      const buildingComp = buildings.get(entity);
      if (buildingComp) {
        const t = transforms.get(entity);
        if (t) spawnExplosion(t.tx, t.ty);
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

    if (!state.flags.campusLeveled) {
      let campusRemaining = 0;
      state.buildingMeta.forEach((meta) => {
        if (meta.category === 'campus') campusRemaining += 1;
      });
      if (campusRemaining === 0) state.flags.campusLeveled = true;
    }

    if (
      state.flags.aliensTriggered &&
      !state.flags.aliensDefeated &&
      state.alienEntities.size === 0
    ) {
      state.flags.aliensDefeated = true;
    }

    if (!state.rescue.survivorsSpawned && state.flags.campusLeveled && state.flags.aliensDefeated) {
      spawnSurvivors(scenario.survivorSites);
      const rescueCue = getRescueCueBuffer();
      if (rescueCue) bus.playSfx(rescueCue);
      state.rescue.survivorsSpawned = true;
      state.rescue.total = scenario.survivorSites.reduce(
        (sum, site) => sum + Math.max(0, Math.round(site.count)),
        0,
      );
    }

    mission.update();
    if (mission.state.complete && ui.state === 'in-game') {
      ui.state = 'win';
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
