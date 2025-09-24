import type { RuntimeTilemap } from '../../world/tiles/tiled';
import { isoMapBounds, tileToIso } from '../../render/iso/projection';
import { getCanvasViewMetrics } from '../../render/canvas/metrics';
import {
  drawBuilding,
  drawMothershipTeslaTower,
  drawShieldPylons,
  drawSynapseCluster,
} from '../../render/sprites/buildings';
import { drawRubble } from '../../render/sprites/rubble';
import { drawForceFieldDome } from '../../render/sprites/forceField';
import { drawSafeHouse, type SafeHouseParams } from '../../render/sprites/safehouse';
import { drawPickupCrate } from '../../render/sprites/pickups';
import {
  drawAAATurret,
  drawSAM,
  drawPatrolDrone,
  drawChaserDrone,
  drawAlienMonstrosity,
  drawVoruskNeurofurnace,
  drawSentinelDrone,
  drawObeliskTurret,
  drawSpeedboat,
} from '../../render/sprites/targets';
import { drawPad, drawHeli, drawCrashSite } from '../../render/sprites/heli';
import { PLAYER_RESPAWN_DURATION } from '../../game/app/constants';
import { drawRescueRunner } from '../../render/sprites/rescuees';
import { drawHUD } from '../../ui/hud/hud';
import type { ObjectiveLine } from '../../ui/hud/hud';
import { renderSettings, renderAchievements, renderAbout } from '../../ui/menus/renderers';
import type { AchievementRenderState } from '../../game/achievements/tracker';
import type { Menu } from '../../ui/menus/menu';
import type { UIStore } from '../../ui/menus/scenes';
import type { MissionTracker } from '../../game/missions/tracker';
import type { MissionCoordinator, ObjectiveLabelFn } from '../../game/missions/coordinator';
import type { GameState } from '../../game/app/state';
import type { BootstrapResult } from '../../game/app/bootstrap';
import type { Entity } from '../../core/ecs/entities';
import type { Camera2D } from '../camera/camera';
import type { IsoTilemapRenderer } from '../draw/tilemap';
import type { ParallaxSky } from '../draw/parallax';
import type { FogOfWar } from '../draw/fog';
import type { CameraShake } from '../camera/shake';
import type { ProjectilePool } from '../../game/systems/Projectile';
import type { DebugOverlay } from '../debug/overlay';
import type { PadConfig } from '../../game/scenarios/layouts';

export interface GameSceneRendererDeps {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  resizeCanvasToDisplaySize: () => void;
  renderer: IsoTilemapRenderer;
  camera: Camera2D;
  sky: ParallaxSky;
  fog: FogOfWar;
  shake: CameraShake;
  projectilePool: ProjectilePool;
  debug: DebugOverlay;
}

export interface GameSceneRenderArgs {
  state: GameState;
  ui: UIStore;
  titleMenu: Menu;
  mission: MissionTracker;
  objectiveLabels: Record<string, ObjectiveLabelFn>;
  missionBriefing: ReturnType<MissionCoordinator['getBriefing']>;
  runtimeMap: RuntimeTilemap;
  isoParams: { tileWidth: number; tileHeight: number };
  stores: BootstrapResult['stores'];
  player: Entity;
  pad: PadConfig;
  safeHouse: SafeHouseParams;
  achievements: AchievementRenderState;
  powerupSelection: {
    roundLabel: string;
    highlightedIndex: number;
    options: Array<{ title: string; description: string }>;
  } | null;
  fps: number;
  dt: number;
}

export interface GameSceneRenderer {
  render: (args: GameSceneRenderArgs) => void;
}

type ShieldSite = {
  tx: number;
  ty: number;
  width: number;
  depth: number;
  height: number;
};

export function createGameSceneRenderer(deps: GameSceneRendererDeps): GameSceneRenderer {
  const wrapText = (text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (let i = 0; i < words.length; i += 1) {
      const word = words[i]!;
      const testLine = current ? `${current} ${word}` : word;
      if (deps.context.measureText(testLine).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = testLine;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const renderMenuScenes = (args: GameSceneRenderArgs): boolean => {
    const { ui, titleMenu, achievements } = args;
    if (ui.state === 'title') {
      titleMenu.render(deps.context, 'Choppa', 'Isometric helicopter action prototype');
      return true;
    }
    if (ui.state === 'settings') {
      renderSettings(deps.context, ui);
      return true;
    }
    if (ui.state === 'achievements') {
      renderAchievements(deps.context, achievements);
      return true;
    }
    if (ui.state === 'about') {
      renderAbout(deps.context);
      return true;
    }
    return false;
  };

  const renderWorldLayer = (
    args: GameSceneRenderArgs,
    originWithShakeX: number,
    originWithShakeY: number,
  ): void => {
    const { runtimeMap, isoParams, stores, safeHouse, state } = args;
    deps.renderer.draw(deps.context, runtimeMap, isoParams, originWithShakeX, originWithShakeY);

    for (let i = 0; i < state.rubble.length; i += 1) {
      const decal = state.rubble[i]!;
      drawRubble(deps.context, isoParams, originWithShakeX, originWithShakeY, decal);
    }

    let shieldSite: ShieldSite | null = null;

    stores.buildings.forEach((entity, building) => {
      const t = stores.transforms.get(entity);
      const h = stores.healths.get(entity);
      if (!t || !h) return;
      const damage01 = 1 - h.current / h.max;
      const meta = state.buildingMeta.get(entity);
      if (meta?.tag === 'mothership-conduit') {
        drawMothershipTeslaTower(deps.context, isoParams, originWithShakeX, originWithShakeY, {
          tx: t.tx,
          ty: t.ty,
          width: building.width,
          depth: building.depth,
          height: building.height,
          damage01,
        });
      } else if (meta?.tag === 'homeland-synapse-cluster') {
        drawSynapseCluster(deps.context, isoParams, originWithShakeX, originWithShakeY, {
          tx: t.tx,
          ty: t.ty,
          width: building.width,
          depth: building.depth,
          height: building.height,
          damage01,
        });
      } else if (meta?.tag === 'homeland-shield-pylon') {
        drawShieldPylons(deps.context, isoParams, originWithShakeX, originWithShakeY, {
          tx: t.tx,
          ty: t.ty,
          width: building.width,
          depth: building.depth,
          height: building.height,
          damage01,
        });
      } else {
        drawBuilding(deps.context, isoParams, originWithShakeX, originWithShakeY, {
          tx: t.tx,
          ty: t.ty,
          width: building.width,
          depth: building.depth,
          height: building.height,
          bodyColor: building.bodyColor,
          roofColor: building.roofColor,
          ruinColor: building.ruinColor,
          damage01,
        });
      }
      if (state.flags.mothershipShieldActive && meta?.tag === 'mothership-shield') {
        shieldSite = {
          tx: t.tx,
          ty: t.ty,
          width: building.width,
          depth: building.depth,
          height: building.height,
        };
      }
    });

    if (shieldSite && state.flags.mothershipShieldActive) {
      drawForceFieldDome(deps.context, isoParams, originWithShakeX, originWithShakeY, shieldSite);
    }

    drawSafeHouse(deps.context, isoParams, originWithShakeX, originWithShakeY, safeHouse);
  };

  const renderEntityLayer = (
    args: GameSceneRenderArgs,
    originWithShakeX: number,
    originWithShakeY: number,
  ): void => {
    const { isoParams, stores, player, state, pad, ui } = args;
    const playerTransform = stores.transforms.get(player);
    if (!playerTransform) return;

    const playerCollectorIso = tileToIso(playerTransform.tx, playerTransform.ty, isoParams);
    stores.pickups.forEach((entity, pickup) => {
      const t = stores.transforms.get(entity);
      if (!t) return;
      let collectorIso: { x: number; y: number } | null = null;
      if (pickup.collectingBy === player) {
        collectorIso = playerCollectorIso;
      } else if (pickup.collectingBy) {
        const collectorTransform = stores.transforms.get(pickup.collectingBy);
        if (collectorTransform) {
          collectorIso = tileToIso(collectorTransform.tx, collectorTransform.ty, isoParams);
        }
      }
      drawPickupCrate(deps.context, isoParams, originWithShakeX, originWithShakeY, {
        tx: t.tx,
        ty: t.ty,
        kind: pickup.kind,
        collecting: pickup.collectingBy !== null,
        progress: pickup.progress,
        collectorIso,
      });
    });

    stores.aaas.forEach((entity) => {
      const t = stores.transforms.get(entity);
      if (t) drawAAATurret(deps.context, isoParams, originWithShakeX, originWithShakeY, t.tx, t.ty);
    });
    stores.sams.forEach((entity) => {
      const t = stores.transforms.get(entity);
      if (t) drawSAM(deps.context, isoParams, originWithShakeX, originWithShakeY, t.tx, t.ty);
    });
    stores.patrols.forEach((entity) => {
      const t = stores.transforms.get(entity);
      if (t)
        drawPatrolDrone(deps.context, isoParams, originWithShakeX, originWithShakeY, t.tx, t.ty);
    });
    stores.chasers.forEach((entity) => {
      const t = stores.transforms.get(entity);
      if (!t) return;
      const meta = state.enemyMeta.get(entity);
      if (meta?.kind === 'sentinel') {
        drawSentinelDrone(deps.context, isoParams, originWithShakeX, originWithShakeY, t.tx, t.ty);
      } else if (meta?.kind === 'obelisk') {
        drawObeliskTurret(deps.context, isoParams, originWithShakeX, originWithShakeY, t.tx, t.ty);
      } else if (state.alienEntities.has(entity)) {
        drawAlienMonstrosity(
          deps.context,
          isoParams,
          originWithShakeX,
          originWithShakeY,
          t.tx,
          t.ty,
        );
      } else {
        drawChaserDrone(deps.context, isoParams, originWithShakeX, originWithShakeY, t.tx, t.ty);
      }
    });
    stores.bosses.forEach((entity, boss) => {
      const t = stores.transforms.get(entity);
      if (!t) return;
      drawVoruskNeurofurnace(
        deps.context,
        isoParams,
        originWithShakeX,
        originWithShakeY,
        t.tx,
        t.ty,
        boss.enraged,
      );
    });
    stores.speedboats.forEach((entity) => {
      const t = stores.transforms.get(entity);
      if (t) drawSpeedboat(deps.context, isoParams, originWithShakeX, originWithShakeY, t.tx, t.ty);
    });

    deps.projectilePool.draw(
      deps.context,
      originWithShakeX,
      originWithShakeY,
      isoParams.tileWidth,
      isoParams.tileHeight,
    );

    for (let i = 0; i < state.explosions.length; i += 1) {
      const explosion = state.explosions[i]!;
      const iso = tileToIso(explosion.tx, explosion.ty, isoParams);
      const drawX = originWithShakeX + iso.x;
      const drawY = originWithShakeY + iso.y - 10;
      const progress = Math.min(1, explosion.age / explosion.duration);
      const alpha = 1 - progress;
      const scale = Math.max(isoParams.tileWidth, isoParams.tileHeight) * 0.45;
      const outerRadius = explosion.radius * scale * (0.9 + (1 - progress) * 0.35);
      const coreRadius = outerRadius * 0.45;

      deps.context.save();
      deps.context.globalAlpha = Math.max(0, alpha * 0.9);
      deps.context.globalCompositeOperation = 'lighter';
      const gradient = deps.context.createRadialGradient(
        drawX,
        drawY,
        0,
        drawX,
        drawY,
        outerRadius,
      );
      gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
      gradient.addColorStop(0.35, 'rgba(255,214,102,0.85)');
      gradient.addColorStop(0.75, 'rgba(255,111,89,0.55)');
      gradient.addColorStop(1, 'rgba(255,71,71,0)');
      deps.context.fillStyle = gradient;
      deps.context.beginPath();
      deps.context.arc(drawX, drawY, outerRadius, 0, Math.PI * 2);
      deps.context.fill();
      deps.context.restore();

      deps.context.save();
      deps.context.globalAlpha = Math.max(0, alpha * 0.75);
      deps.context.fillStyle = '#fff2d5';
      deps.context.beginPath();
      deps.context.arc(drawX, drawY, coreRadius, 0, Math.PI * 2);
      deps.context.fill();
      deps.context.restore();

      deps.context.save();
      deps.context.globalAlpha = Math.max(0, alpha * 0.5);
      deps.context.strokeStyle = '#ffd166';
      deps.context.lineWidth = 2;
      const shockRadius = outerRadius * (0.85 + progress * 0.4);
      deps.context.beginPath();
      deps.context.arc(drawX, drawY, shockRadius, 0, Math.PI * 2);
      deps.context.stroke();
      deps.context.restore();
    }

    drawPad(deps.context, isoParams, originWithShakeX, originWithShakeY, pad.tx, pad.ty);

    const runnerScale = isoParams.tileHeight / 32;
    for (let i = 0; i < state.rescueRunners.length; i += 1) {
      const runner = state.rescueRunners[i]!;
      if (runner.delay > 0) continue;
      const t = Math.min(1, runner.progress);
      const isoX = runner.startIso.x + (runner.endIso.x - runner.startIso.x) * t;
      const isoY = runner.startIso.y + (runner.endIso.y - runner.startIso.y) * t;
      const drawX = originWithShakeX + isoX;
      const drawY = originWithShakeY + isoY;
      const dirX = runner.endIso.x - runner.startIso.x;
      const dirY = runner.endIso.y - runner.startIso.y;
      const angle = Math.atan2(dirY, dirX);
      const phase = runner.elapsed * 11 + runner.bobOffset;
      const bob = Math.sin(phase) * runnerScale * 1.6;
      const fade = runner.progress <= 1 ? 1 : Math.max(0, 1 - (runner.progress - 1) / 0.3);
      drawRescueRunner(deps.context, {
        x: drawX,
        y: drawY,
        angle: Number.isFinite(angle) ? angle : 0,
        stepPhase: phase,
        bob,
        fade,
        scale: runnerScale,
      });
    }

    const sprite = stores.sprites.get(player);
    if (!sprite) return;

    const respawning = state.player.invulnerable && ui.state === 'in-game';
    if (respawning) {
      const elapsed = Math.max(
        0,
        Math.min(PLAYER_RESPAWN_DURATION, PLAYER_RESPAWN_DURATION - state.player.respawnTimer),
      );
      drawCrashSite(deps.context, {
        tx: playerTransform.tx,
        ty: playerTransform.ty,
        iso: isoParams,
        originX: originWithShakeX,
        originY: originWithShakeY,
        elapsed,
        duration: PLAYER_RESPAWN_DURATION,
      });
    } else {
      drawHeli(deps.context, {
        tx: playerTransform.tx,
        ty: playerTransform.ty,
        rot: playerTransform.rot,
        rotorPhase: sprite.rotor,
        color: sprite.color,
        iso: isoParams,
        originX: originWithShakeX,
        originY: originWithShakeY,
      });
    }
  };

  const renderUiLayer = (
    args: GameSceneRenderArgs,
    viewWidth: number,
    viewHeight: number,
    originWithShakeX: number,
    originWithShakeY: number,
    cameraIsoX: number,
    cameraIsoY: number,
  ): void => {
    const { state, ui, mission, objectiveLabels, isoParams, stores, player, missionBriefing } =
      args;
    const playerTransform = stores.transforms.get(player);
    if (!playerTransform) return;

    state.minimapEnemies.length = 0;
    stores.colliders.forEach((entity, collider) => {
      if (collider.team !== 'enemy') return;
      const t = stores.transforms.get(entity);
      if (t) state.minimapEnemies.push({ tx: t.tx, ty: t.ty });
    });

    const revealRadius = Math.max(120, Math.min(viewWidth, viewHeight) * 0.22);
    deps.fog.reveal(playerTransform.tx, playerTransform.ty, revealRadius, isoParams);
    if (ui.settings.fogOfWar) {
      deps.fog.render(deps.context, {
        iso: isoParams,
        originX: originWithShakeX,
        originY: originWithShakeY,
        cameraX: cameraIsoX,
        cameraY: cameraIsoY,
        viewWidth,
        viewHeight,
      });
    }

    const fuelComp = stores.fuels.get(player)!;
    const ammoComp = stores.ammos.get(player)!;
    const healthComp = stores.healths.get(player)!;

    const objectiveLines: ObjectiveLine[] = mission.state.objectives.map((objective) => {
      const labelFn = objectiveLabels[objective.id];
      const label = labelFn ? labelFn(objective) : objective.name;
      return { label, complete: objective.complete };
    });

    const nextWaveCountdown =
      !state.wave.active && Number.isFinite(state.wave.countdown)
        ? Math.max(0, state.wave.countdown)
        : null;

    let bossHud: { name: string; health01: number; enraged: boolean } | null = null;
    const bossState = state.finalBoss;
    if (bossState.phase !== 'inactive' && bossState.entity) {
      const bossHealth = stores.healths.get(bossState.entity);
      const max = bossState.healthMax > 0 ? bossState.healthMax : (bossHealth?.max ?? 0);
      const current = bossState.health > 0 ? bossState.health : (bossHealth?.current ?? 0);
      if (max > 0) {
        bossHud = {
          name: bossState.name || 'Unknown Horror',
          health01: Math.max(0, Math.min(1, current / max)),
          enraged: bossState.enraged,
        };
      }
    }

    drawHUD(
      deps.context,
      {
        fuel01: fuelComp.current / fuelComp.max,
        fuelCurrent: fuelComp.current,
        fuelMax: fuelComp.max,
        armor01: healthComp.current / healthComp.max,
        ammo: {
          missiles: ammoComp.missiles,
          rockets: ammoComp.rockets,
          hellfires: ammoComp.hellfires,
        },
        ammoMax: {
          missiles: ammoComp.missilesMax,
          rockets: ammoComp.rocketsMax,
          hellfires: ammoComp.hellfiresMax,
        },
        lives: Math.max(0, state.player.lives),
        score: state.stats.score,
        wave: state.wave.active ? state.wave.index : Math.max(1, state.wave.index + 1),
        enemiesRemaining: state.wave.enemies.size,
        nextWaveIn: nextWaveCountdown,
      },
      objectiveLines,
      bossHud,
      null,
      {
        enabled: ui.settings.minimap,
        mapW: args.runtimeMap.width,
        mapH: args.runtimeMap.height,
        player: { tx: playerTransform.tx, ty: playerTransform.ty },
        enemies: state.minimapEnemies,
      },
      isoParams,
      args.achievements.banners,
    );

    if (state.player.invulnerable && ui.state === 'in-game') {
      deps.context.save();
      deps.context.fillStyle = 'rgba(0, 0, 0, 0.35)';
      deps.context.fillRect(0, 0, viewWidth, viewHeight);
      deps.context.fillStyle = '#ffd166';
      deps.context.font = 'bold 18px system-ui, sans-serif';
      deps.context.textAlign = 'center';
      deps.context.fillText('Respawning...', viewWidth / 2, viewHeight / 2);
      deps.context.restore();
    }

    if (ui.state === 'powerup-select') {
      deps.context.save();
      deps.context.fillStyle = 'rgba(4, 10, 18, 0.72)';
      deps.context.fillRect(0, 0, viewWidth, viewHeight);
      deps.context.textAlign = 'center';
      deps.context.fillStyle = '#92ffa6';
      deps.context.font = 'bold 28px system-ui, sans-serif';
      const heading = args.powerupSelection
        ? `${args.powerupSelection.roundLabel} Power-Up`
        : 'Power-Up Selection';
      deps.context.fillText(heading, viewWidth / 2, viewHeight / 2 - 170);

      if (args.powerupSelection) {
        const { options, highlightedIndex } = args.powerupSelection;
        const cardWidth = 220;
        const cardHeight = 180;
        const gap = 28;
        const totalWidth = options.length * cardWidth + Math.max(0, options.length - 1) * gap;
        const startX = viewWidth / 2 - totalWidth / 2;
        const startY = viewHeight / 2 - cardHeight / 2 - 10;
        for (let i = 0; i < options.length; i += 1) {
          const option = options[i]!;
          const cardX = startX + i * (cardWidth + gap);
          const isHighlighted = i === highlightedIndex;
          deps.context.fillStyle = isHighlighted
            ? 'rgba(20, 38, 56, 0.95)'
            : 'rgba(11, 24, 38, 0.9)';
          deps.context.fillRect(cardX, startY, cardWidth, cardHeight);
          deps.context.lineWidth = isHighlighted ? 3 : 1.5;
          deps.context.strokeStyle = isHighlighted ? '#ffd166' : 'rgba(146, 255, 166, 0.4)';
          deps.context.strokeRect(cardX, startY, cardWidth, cardHeight);

          deps.context.textAlign = 'center';
          deps.context.fillStyle = '#92ffa6';
          deps.context.font = 'bold 16px system-ui, sans-serif';
          deps.context.fillText(option.title, cardX + cardWidth / 2, startY + 32);

          deps.context.textAlign = 'left';
          deps.context.fillStyle = '#c8d7e1';
          deps.context.font = '14px system-ui, sans-serif';
          const lines = wrapText(option.description, cardWidth - 32);
          let textY = startY + 58;
          for (let j = 0; j < lines.length; j += 1) {
            deps.context.fillText(lines[j]!, cardX + 16, textY + j * 18);
          }

          deps.context.fillStyle = '#6c8294';
          deps.context.font = '12px system-ui, sans-serif';
          deps.context.fillText(`Press ${i + 1}`, cardX + 16, startY + cardHeight - 14);
        }

        deps.context.textAlign = 'center';
        deps.context.fillStyle = '#c8d7e1';
        deps.context.font = 'bold 16px system-ui, sans-serif';
        deps.context.fillText(
          'Use A / D or 1-3 to choose. Press Enter to confirm.',
          viewWidth / 2,
          startY + cardHeight + 34,
        );
      } else {
        deps.context.fillStyle = '#c8d7e1';
        deps.context.font = '16px system-ui, sans-serif';
        deps.context.fillText('Preparing loadout options...', viewWidth / 2, viewHeight / 2 - 110);
      }

      deps.context.restore();
    }

    if (ui.state === 'briefing') {
      deps.context.save();
      deps.context.fillStyle = 'rgba(4, 10, 18, 0.7)';
      deps.context.fillRect(0, 0, viewWidth, viewHeight);
      deps.context.textAlign = 'center';
      deps.context.fillStyle = '#92ffa6';
      deps.context.font = 'bold 28px system-ui, sans-serif';
      deps.context.fillText(missionBriefing.title, viewWidth / 2, viewHeight / 2 - 140);
      deps.context.fillStyle = '#c8d7e1';
      deps.context.font = '16px system-ui, sans-serif';
      const briefingLines = missionBriefing.text.split('\n');
      for (let i = 0; i < briefingLines.length; i += 1) {
        deps.context.fillText(briefingLines[i]!, viewWidth / 2, viewHeight / 2 - 100 + i * 22);
      }
      deps.context.textAlign = 'left';
      const goals = missionBriefing.goals.slice(0, 5);
      const goalX = viewWidth / 2 - 200;
      let goalY = viewHeight / 2 - 20;
      deps.context.font = '15px system-ui, sans-serif';
      for (let i = 0; i < goals.length; i += 1) {
        deps.context.fillText(`• ${goals[i]!}`, goalX, goalY + i * 22);
      }
      deps.context.textAlign = 'center';
      let footerY = goalY + goals.length * 22;
      const dialog = missionBriefing.dialog;
      if (dialog.length > 0) {
        footerY += 20;
        deps.context.fillStyle = '#92ffa6';
        deps.context.font = 'bold 14px system-ui, sans-serif';
        deps.context.fillText('Mission Comms:', viewWidth / 2, footerY);
        footerY += 18;
        deps.context.fillStyle = '#c8d7e1';
        deps.context.font = '14px system-ui, sans-serif';
        for (let i = 0; i < dialog.length; i += 1) {
          deps.context.fillText(dialog[i]!, viewWidth / 2, footerY + i * 18);
        }
        footerY += dialog.length * 18;
      }
      footerY += 24;
      deps.context.fillStyle = '#92ffa6';
      deps.context.font = 'bold 16px system-ui, sans-serif';
      deps.context.fillText('Press Enter to deploy', viewWidth / 2, footerY);
      deps.context.restore();
    }

    if (ui.state === 'paused') {
      deps.context.save();
      deps.context.fillStyle = 'rgba(0, 0, 0, 0.55)';
      deps.context.fillRect(0, 0, viewWidth, viewHeight);
      deps.context.fillStyle = '#92ffa6';
      deps.context.font = 'bold 28px system-ui, sans-serif';
      deps.context.textAlign = 'center';
      deps.context.fillText('Paused', viewWidth / 2, viewHeight / 2);
      deps.context.fillStyle = '#c8d7e1';
      deps.context.font = '14px system-ui, sans-serif';
      deps.context.fillText('Press Esc to resume', viewWidth / 2, viewHeight / 2 + 24);
      deps.context.restore();
    }

    if (ui.state === 'nuke-cinematic') {
      deps.context.save();
      deps.context.fillStyle = 'rgba(4, 0, 12, 0.8)';
      deps.context.fillRect(0, 0, viewWidth, viewHeight);
      const cx = viewWidth / 2;
      const cy = viewHeight / 2;
      const blastRadius = Math.max(viewWidth, viewHeight) * 0.45;
      const blast = deps.context.createRadialGradient(cx, cy, 12, cx, cy, blastRadius);
      blast.addColorStop(0, 'rgba(255, 245, 196, 0.92)');
      blast.addColorStop(0.35, 'rgba(255, 137, 92, 0.8)');
      blast.addColorStop(0.65, 'rgba(146, 72, 255, 0.45)');
      blast.addColorStop(1, 'rgba(0,0,0,0)');
      deps.context.fillStyle = blast;
      deps.context.beginPath();
      deps.context.ellipse(cx, cy, blastRadius, blastRadius * 0.72, 0, 0, Math.PI * 2);
      deps.context.fill();

      deps.context.fillStyle = '#f4f1ff';
      deps.context.font = 'bold 30px system-ui, sans-serif';
      deps.context.textAlign = 'center';
      deps.context.fillText('Black Sun Detonated', cx, cy - 120);
      deps.context.fillStyle = '#d0f7ff';
      deps.context.font = '16px system-ui, sans-serif';
      const dialog = mission.state.def.phaseTwoIntroDialog ?? [];
      const dialogStartY = cy - 70;
      for (let i = 0; i < dialog.length; i += 1) {
        deps.context.fillText(dialog[i]!, cx, dialogStartY + i * 22);
      }

      const promptY = dialogStartY + dialog.length * 22 + 48;
      deps.context.fillStyle = '#92ffa6';
      deps.context.font = 'bold 18px system-ui, sans-serif';
      deps.context.fillText('Press Enter to continue', cx, promptY);
      deps.context.restore();
    }

    if (ui.state === 'game-over') {
      deps.context.save();
      deps.context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      deps.context.fillRect(0, 0, viewWidth, viewHeight);
      deps.context.fillStyle = '#ef476f';
      deps.context.font = 'bold 28px system-ui, sans-serif';
      deps.context.textAlign = 'center';
      deps.context.fillText('Mission Failed', viewWidth / 2, viewHeight / 2);
      deps.context.fillStyle = '#c8d7e1';
      deps.context.font = '14px system-ui, sans-serif';
      deps.context.fillText(
        'Press Enter to restart or Esc for title',
        viewWidth / 2,
        viewHeight / 2 + 26,
      );
      deps.context.restore();
      return;
    }

    if (ui.state === 'win') {
      deps.context.save();
      deps.context.fillStyle = 'rgba(0,0,0,0.6)';
      deps.context.fillRect(0, 0, viewWidth, viewHeight);
      deps.context.fillStyle = '#92ffa6';
      deps.context.font = 'bold 28px system-ui, sans-serif';
      deps.context.textAlign = 'center';
      deps.context.fillText('Mission Complete', viewWidth / 2, viewHeight / 2 - 8);
      deps.context.fillStyle = '#c8d7e1';
      deps.context.font = '14px system-ui, sans-serif';

      const winBaseY = viewHeight / 2 + 16;
      const successDialog = mission.state.def.successDialog;
      if (successDialog && successDialog.length > 0) {
        for (let i = 0; i < successDialog.length; i += 1) {
          deps.context.fillText(successDialog[i]!, viewWidth / 2, winBaseY + i * 20);
        }
      } else {
        deps.context.fillText('Press Enter to restart or Esc for title', viewWidth / 2, winBaseY);
      }
      deps.context.restore();
    }

    if (ui.state === 'final-win') {
      deps.context.save();
      deps.context.fillStyle = 'rgba(0,0,0,0.7)';
      deps.context.fillRect(0, 0, viewWidth, viewHeight);
      deps.context.textAlign = 'center';

      const centerX = viewWidth / 2;
      const centerY = viewHeight / 2;
      const dialog = mission.state.def.finalWinDialog ?? mission.state.def.successDialog ?? [];

      deps.context.fillStyle = '#92ffa6';
      deps.context.font = 'bold 32px system-ui, sans-serif';
      deps.context.fillText('You Won, Game Over', centerX, centerY - 60);

      deps.context.fillStyle = '#c8d7e1';
      deps.context.font = '16px system-ui, sans-serif';
      deps.context.fillText('Created by Ryan Hicks and ChatGPT5 with Codex', centerX, centerY - 20);

      if (dialog.length > 0) {
        deps.context.font = '14px system-ui, sans-serif';
        for (let i = 0; i < dialog.length; i += 1) {
          deps.context.fillText(dialog[i]!, centerX, centerY + 20 + i * 22);
        }
      }

      deps.context.font = '13px system-ui, sans-serif';
      deps.context.fillStyle = '#b4c8d6';
      const returnY = centerY + 20 + dialog.length * 22 + 28;
      deps.context.fillText('Returning to title...', centerX, returnY);

      deps.context.restore();
    }
  };

  return {
    render: (args: GameSceneRenderArgs) => {
      deps.resizeCanvasToDisplaySize();
      const displayWidth = deps.canvas.width;
      const displayHeight = deps.canvas.height;
      deps.fog.resize(displayWidth, displayHeight);

      const { width: viewWidth, height: viewHeight } = getCanvasViewMetrics(deps.context);
      deps.sky.render(deps.context, deps.camera.x, deps.camera.y);

      if (renderMenuScenes(args)) {
        return;
      }

      const playerTransform = args.stores.transforms.get(args.player);
      if (!playerTransform) return;

      deps.camera.bounds = isoMapBounds(
        args.runtimeMap.width,
        args.runtimeMap.height,
        args.isoParams,
      );
      const targetIso = tileToIso(playerTransform.tx, playerTransform.ty, args.isoParams);
      deps.camera.follow(targetIso.x, targetIso.y, viewWidth, viewHeight);

      const originX = Math.floor(viewWidth / 2 - deps.camera.x);
      const originY = Math.floor(viewHeight / 2 - deps.camera.y);
      const shakeOffset = deps.shake.offset(1 / 60);
      const originWithShakeX = originX + shakeOffset.x;
      const originWithShakeY = originY + shakeOffset.y;
      const cameraIsoX = deps.camera.x - shakeOffset.x;
      const cameraIsoY = deps.camera.y - shakeOffset.y;

      renderWorldLayer(args, originWithShakeX, originWithShakeY);
      renderEntityLayer(args, originWithShakeX, originWithShakeY);
      renderUiLayer(
        args,
        viewWidth,
        viewHeight,
        originWithShakeX,
        originWithShakeY,
        cameraIsoX,
        cameraIsoY,
      );

      deps.debug.render(deps.context, {
        fps: args.fps,
        dt: args.dt,
        entities: args.state.enemyMeta.size + 1,
      });
    },
  };
}
