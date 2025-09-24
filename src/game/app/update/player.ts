import type { InputSnapshot } from '../../../core/input/input';
import { isDown, type KeyBindings } from '../../../ui/input-remap/bindings';
import type { UIStore } from '../../../ui/menus/scenes';
import type { GameState } from '../state';
import type { Entity } from '../../../core/ecs/entities';
import type { ComponentStore } from '../../../core/ecs/components';
import type { Transform } from '../../components/Transform';
import type { Physics } from '../../components/Physics';
import type { Fuel } from '../../components/Fuel';
import type { Ammo } from '../../components/Ammo';
import type { Health } from '../../components/Health';
import type { Collider } from '../../components/Collider';
import type { RuntimeTilemap } from '../../../world/tiles/tiled';
import { screenToApproxTile } from '../../../render/iso/projection';
import { getCanvasViewMetrics } from '../../../render/canvas/metrics';
import type { WeaponFireSystem } from '../../systems/WeaponFire';
import type { EngineSound } from '../../../core/audio/sfx';
import type { Camera2D } from '../../../render/camera/camera';

export interface PlayerControllerDeps {
  state: GameState;
  ui: UIStore;
  player: Entity;
  transforms: ComponentStore<Transform>;
  physics: ComponentStore<Physics>;
  fuels: ComponentStore<Fuel>;
  ammos: ComponentStore<Ammo>;
  healths: ComponentStore<Health>;
  colliders: ComponentStore<Collider>;
  weaponFire: WeaponFireSystem;
  engine: EngineSound;
  bindings: KeyBindings;
  camera: Camera2D;
  context: CanvasRenderingContext2D;
  getStartPosition: () => { tx: number; ty: number };
}

export interface PlayerController {
  update: (
    dt: number,
    snapshot: InputSnapshot,
    isoParams: { tileWidth: number; tileHeight: number },
    map: RuntimeTilemap,
  ) => void;
  resetPlayer: () => void;
}

export function createPlayerController({
  state,
  ui,
  player,
  transforms,
  physics,
  fuels,
  ammos,
  healths,
  colliders,
  weaponFire,
  engine,
  bindings,
  camera,
  context,
  getStartPosition,
}: PlayerControllerDeps): PlayerController {
  const tryRespawn = (dt: number): void => {
    if (!state.player.invulnerable || ui.state === 'game-over') return;
    state.player.respawnTimer -= dt;
    if (state.player.respawnTimer <= 0 && state.player.lives > 0) {
      resetPlayerInternal();
    }
  };

  const resetPlayerInternal = (): void => {
    const start = getStartPosition();
    const transform = transforms.get(player);
    const body = physics.get(player);
    const fuel = fuels.get(player);
    const ammo = ammos.get(player);
    const health = healths.get(player);
    if (transform && body && fuel && ammo && health) {
      transform.tx = start.tx;
      transform.ty = start.ty;
      transform.rot = 0;
      body.vx = 0;
      body.vy = 0;
      body.ax = 0;
      body.ay = 0;
      fuel.current = fuel.max;
      ammo.missiles = ammo.missilesMax;
      ammo.rockets = ammo.rocketsMax;
      ammo.hellfires = ammo.hellfiresMax;
      health.current = health.max;
      colliders.set(player, { radius: 0.4, team: 'player' });
    }
    state.player.respawnTimer = 0;
    state.player.invulnerable = false;
    engine.start();
    engine.setIntensity(0);
  };

  const update = (
    dt: number,
    snapshot: InputSnapshot,
    isoParams: { tileWidth: number; tileHeight: number },
    map: RuntimeTilemap,
  ): void => {
    tryRespawn(dt);

    const transform = transforms.get(player)!;
    const body = physics.get(player)!;
    let dx = 0;
    let dy = 0;
    if (!state.player.invulnerable) {
      if (isDown(snapshot, bindings, 'moveUp')) dy -= 1;
      if (isDown(snapshot, bindings, 'moveDown')) dy += 1;
      if (isDown(snapshot, bindings, 'moveLeft')) dx -= 1;
      if (isDown(snapshot, bindings, 'moveRight')) dx += 1;
      if (isDown(snapshot, bindings, 'strafeLeft')) dx -= 1;
      if (isDown(snapshot, bindings, 'strafeRight')) dx += 1;
    }
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
    }
    const accel = 12;
    body.ax = dx * accel;
    body.ay = dy * accel;

    const speed = Math.min(1, Math.hypot(body.vx, body.vy) / (body.maxSpeed || 1));
    engine.start();
    engine.setIntensity(speed);

    const { width: viewWidth, height: viewHeight } = getCanvasViewMetrics(context);
    let aimTile = screenToApproxTile(
      snapshot.mouseX,
      snapshot.mouseY,
      viewWidth,
      viewHeight,
      camera.x,
      camera.y,
      isoParams,
    );
    const aimDx = aimTile.x - transform.tx;
    const aimDy = aimTile.y - transform.ty;
    if (!Number.isFinite(aimDx) || !Number.isFinite(aimDy) || Math.hypot(aimDx, aimDy) < 0.3) {
      aimTile = {
        x: transform.tx + Math.cos(transform.rot),
        y: transform.ty + Math.sin(transform.rot),
      };
    }
    weaponFire.setInput(snapshot, aimTile.x, aimTile.y, !state.player.invulnerable);

    const margin = 1.2;
    const maxX = map.width - 1 - margin;
    const maxY = map.height - 1 - margin;
    transform.tx = Math.max(margin, Math.min(maxX, transform.tx));
    transform.ty = Math.max(margin, Math.min(maxY, transform.ty));
  };

  return {
    update,
    resetPlayer: resetPlayerInternal,
  };
}
