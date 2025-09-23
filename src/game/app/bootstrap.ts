import { InputManager } from '../../core/input/input';
import { DebugOverlay } from '../../render/debug/overlay';
import { IsoTilemapRenderer } from '../../render/draw/tilemap';
import { Camera2D } from '../../render/camera/camera';
import { ParallaxSky } from '../../render/draw/parallax';
import { Menu } from '../../ui/menus/menu';
import { createUIStore, type UIStore } from '../../ui/menus/scenes';
import { FogOfWar } from '../../render/draw/fog';
import { AudioBus } from '../../core/audio/audio';
import { MusicController } from '../../core/audio/music';
import { EngineSound } from '../../core/audio/sfx';
import { CameraShake } from '../../render/camera/shake';
import { EntityRegistry, type Entity } from '../../core/ecs/entities';
import { ComponentStore } from '../../core/ecs/components';
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
import { SystemScheduler } from '../../core/ecs/systems';
import { MovementSystem } from '../systems/Movement';
import { RotorSpinSystem } from '../systems/RotorSpin';
import { FuelDrainSystem } from '../systems/FuelDrain';
import { WeaponFireSystem, type FireEvent } from '../systems/WeaponFire';
import { RNG } from '../../core/util/rng';
import { ProjectilePool } from '../systems/Projectile';
import { AIControlSystem } from '../systems/AIControl';
import { EnemyBehaviorSystem } from '../systems/EnemyBehavior';
import { SpeedboatBehaviorSystem } from '../systems/SpeedboatBehavior';
import { DamageSystem } from '../systems/Damage';
import { loadJson } from '../../core/util/storage';
import { loadBindings, type KeyBindings } from '../../ui/input-remap/bindings';

export interface BootstrapResult {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  resizeCanvasToDisplaySize: () => void;
  input: InputManager;
  debug: DebugOverlay;
  ui: UIStore;
  titleMenu: Menu;
  bindings: KeyBindings;
  renderer: IsoTilemapRenderer;
  camera: Camera2D;
  sky: ParallaxSky;
  fog: FogOfWar;
  audio: {
    bus: AudioBus;
    engine: EngineSound;
    music: MusicController;
    applySettings: (muted: boolean) => void;
  };
  shake: CameraShake;
  entities: EntityRegistry;
  stores: {
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
    healths: ComponentStore<Health>;
    colliders: ComponentStore<Collider>;
    buildings: ComponentStore<Building>;
    pickups: ComponentStore<Pickup>;
    speedboats: ComponentStore<Speedboat>;
  };
  scheduler: SystemScheduler;
  rng: RNG;
  projectilePool: ProjectilePool;
  fireEvents: FireEvent[];
  weaponFire: WeaponFireSystem;
  damage: DamageSystem;
  setPlayerLocator: (fn: () => { x: number; y: number }) => void;
  setBoatLandingHandler: (fn: (entity: Entity) => void) => void;
}

function setupCanvas(): {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  resizeCanvasToDisplaySize: () => void;
} {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('Canvas element with id "game" not found');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Failed to get 2D context');

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  function resizeCanvasToDisplaySize(): void {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const displayWidth = Math.floor(canvas.clientWidth * dpr);
    const displayHeight = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resizeCanvasToDisplaySize);
  resizeCanvasToDisplaySize();

  return { canvas, context, resizeCanvasToDisplaySize };
}

function setupInput(): { input: InputManager; bindings: KeyBindings } {
  const input = new InputManager();
  input.attach(window);
  const bindings = loadBindings();
  return { input, bindings };
}

function setupDebug(): DebugOverlay {
  const debug = new DebugOverlay();
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === '~') debug.toggle();
  });
  return debug;
}

function setupUI(): { ui: UIStore; titleMenu: Menu } {
  const ui: UIStore = loadJson<UIStore>('choppa:ui', createUIStore());
  ui.state = 'title';
  const titleMenu = new Menu([
    { id: 'start', label: 'Start Mission' },
    { id: 'settings', label: 'Settings' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'about', label: 'About' },
    { id: 'reset-progress', label: 'Reset Progress' },
  ]);
  return { ui, titleMenu };
}

function setupAudio(ui: UIStore): {
  bus: AudioBus;
  engine: EngineSound;
  music: MusicController;
  applySettings: (muted: boolean) => void;
} {
  const bus = new AudioBus({
    masterVolume: ui.settings.masterVolume,
    musicVolume: ui.settings.musicVolume,
    sfxVolume: ui.settings.sfxVolume,
  });
  const engine = new EngineSound(bus);
  const audioBase = (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');
  const music = new MusicController(bus, {
    title: `${audioBase}audio/title.mp3`,
    level1: `${audioBase}audio/level1.mp3`,
    level2: `${audioBase}audio/level2.mp3`,
    level3: `${audioBase}audio/level3.mp3`,
  });
  const applySettings = (muted: boolean): void => {
    bus.setMaster(muted ? 0 : ui.settings.masterVolume);
    bus.setMusic(ui.settings.musicVolume);
    bus.setSfx(ui.settings.sfxVolume);
  };
  applySettings(false);
  return { bus, engine, music, applySettings };
}

function setupEcs(): {
  entities: EntityRegistry;
  stores: BootstrapResult['stores'];
} {
  const entities = new EntityRegistry();
  const stores = {
    transforms: new ComponentStore<Transform>(),
    physics: new ComponentStore<Physics>(),
    fuels: new ComponentStore<Fuel>(),
    sprites: new ComponentStore<Sprite>(),
    ammos: new ComponentStore<Ammo>(),
    weapons: new ComponentStore<WeaponHolder>(),
    aaas: new ComponentStore<AAA>(),
    sams: new ComponentStore<SAM>(),
    patrols: new ComponentStore<PatrolDrone>(),
    chasers: new ComponentStore<ChaserDrone>(),
    healths: new ComponentStore<Health>(),
    colliders: new ComponentStore<Collider>(),
    buildings: new ComponentStore<Building>(),
    pickups: new ComponentStore<Pickup>(),
    speedboats: new ComponentStore<Speedboat>(),
  };
  return { entities, stores };
}

function setupSystems(
  stores: BootstrapResult['stores'],
  rng: RNG,
): {
  scheduler: SystemScheduler;
  projectilePool: ProjectilePool;
  fireEvents: FireEvent[];
  weaponFire: WeaponFireSystem;
  damage: DamageSystem;
  setPlayerLocator: (fn: () => { x: number; y: number }) => void;
  setBoatLandingHandler: (fn: (entity: Entity) => void) => void;
} {
  const scheduler = new SystemScheduler();
  const projectilePool = new ProjectilePool();
  const fireEvents: FireEvent[] = [];
  const weaponFire = new WeaponFireSystem(
    stores.transforms,
    stores.physics,
    stores.weapons,
    stores.ammos,
    fireEvents,
    rng,
  );
  const damage = new DamageSystem(stores.transforms, stores.colliders, stores.healths);
  scheduler.add(new MovementSystem(stores.transforms, stores.physics));
  scheduler.add(new RotorSpinSystem(stores.sprites));
  scheduler.add(new FuelDrainSystem(stores.fuels, stores.healths, damage));
  scheduler.add(weaponFire);

  let playerLocator: () => { x: number; y: number } = () => ({ x: 0, y: 0 });
  let boatLanding: (entity: Entity) => void = () => {};

  const aiControl = new AIControlSystem(
    stores.transforms,
    stores.aaas,
    stores.sams,
    fireEvents,
    rng,
    () => playerLocator(),
  );
  const enemyBehavior = new EnemyBehaviorSystem(
    stores.transforms,
    stores.physics,
    stores.patrols,
    stores.chasers,
    fireEvents,
    rng,
    () => playerLocator(),
  );
  const boatBehavior = new SpeedboatBehaviorSystem(
    stores.transforms,
    stores.physics,
    stores.speedboats,
    fireEvents,
    rng,
    () => playerLocator(),
    (entity) => boatLanding(entity),
  );

  scheduler.add(aiControl);
  scheduler.add(enemyBehavior);
  scheduler.add(boatBehavior);

  const setPlayerLocator = (fn: () => { x: number; y: number }): void => {
    playerLocator = fn;
  };
  const setBoatLandingHandler = (fn: (entity: Entity) => void): void => {
    boatLanding = fn;
  };

  return {
    scheduler,
    projectilePool,
    fireEvents,
    weaponFire,
    damage,
    setPlayerLocator,
    setBoatLandingHandler,
  };
}

export function bootstrapApp(): BootstrapResult {
  const { canvas, context, resizeCanvasToDisplaySize } = setupCanvas();
  const { input, bindings } = setupInput();
  const debug = setupDebug();
  const { ui, titleMenu } = setupUI();
  const audio = setupAudio(ui);
  const renderer = new IsoTilemapRenderer();
  const camera = new Camera2D({ deadzoneWidth: 160, deadzoneHeight: 120, lerp: 0.12 });
  const sky = new ParallaxSky();
  const fog = new FogOfWar();
  const shake = new CameraShake();
  const { entities, stores } = setupEcs();
  const rng = new RNG(1337);
  const systems = setupSystems(stores, rng);

  return {
    canvas,
    context,
    resizeCanvasToDisplaySize,
    input,
    debug,
    ui,
    titleMenu,
    bindings,
    renderer,
    camera,
    sky,
    fog,
    audio,
    shake,
    entities,
    stores,
    scheduler: systems.scheduler,
    rng,
    projectilePool: systems.projectilePool,
    fireEvents: systems.fireEvents,
    weaponFire: systems.weaponFire,
    damage: systems.damage,
    setPlayerLocator: systems.setPlayerLocator,
    setBoatLandingHandler: systems.setBoatLandingHandler,
  };
}
