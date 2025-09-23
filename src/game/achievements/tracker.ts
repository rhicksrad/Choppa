import type { UIStore } from '../../ui/menus/scenes';
import type { GameState } from '../app/state';
import type { MissionTracker } from '../missions/tracker';
import { ACHIEVEMENTS, achievementMap } from './definitions';

const ORDER_LOOKUP = new Map<string, number>();
ACHIEVEMENTS.forEach((achievement, index) => {
  ORDER_LOOKUP.set(achievement.id, achievement.sortOrder ?? (index + 1) * 10);
});

const BANNER_FADE_IN = 0.25;
const BANNER_HOLD = 3.25;
const BANNER_FADE_OUT = 0.55;
const BANNER_LIFETIME = BANNER_FADE_IN + BANNER_HOLD + BANNER_FADE_OUT;

interface BannerState {
  id: string;
  age: number;
}

export interface AchievementBannerView {
  id: string;
  title: string;
  description: string;
  alpha: number;
  slideOffset: number;
}

export interface AchievementRenderState {
  definitions: AchievementDef[];
  unlocked: ReadonlySet<string>;
  banners: AchievementBannerView[];
}

export interface AchievementTrackerDeps {
  ui: UIStore;
  saveUI: (ui: UIStore) => void;
}

export class AchievementTracker {
  private readonly ui: UIStore;

  private readonly saveUI: (ui: UIStore) => void;

  private readonly unlocked = new Set<string>();

  private readonly banners: BannerState[] = [];

  public constructor({ ui, saveUI }: AchievementTrackerDeps) {
    this.ui = ui;
    this.saveUI = saveUI;

    const saved = Array.isArray(ui.achievements?.unlocked) ? ui.achievements.unlocked : [];
    for (let i = 0; i < saved.length; i += 1) {
      const id = saved[i];
      if (id && typeof id === 'string') {
        this.unlocked.add(id);
      }
    }
    this.syncStore();
  }

  public update(dt: number, state: GameState, mission: MissionTracker): void {
    this.updateBanners(dt);

    if (state.stats.score > 0) this.unlock('rookie-strike');
    if (state.flags.campusLeveled) this.unlock('campus-liberator');
    if (state.flags.aliensTriggered && state.flags.aliensDefeated)
      this.unlock('counterattack-crushed');
    if (state.rescue.total > 0 && state.rescue.rescued >= state.rescue.total)
      this.unlock('evac-ace');

    const missionId = mission.state.def.id;

    if (missionId === 'm01') {
      const waveObjective = mission.state.objectives.find((o) => o.id === 'obj4');
      if (waveObjective?.complete) this.unlock('wavebreaker');
      if (this.ui.state === 'win') this.unlock('dawnshield-complete');
    } else if (missionId === 'm02') {
      if (this.ui.state === 'win' && state.boat.boatsEscaped === 0)
        this.unlock('stormbreak-guardian');
    } else if (missionId === 'm03') {
      if (this.ui.state === 'win') this.unlock('starfall-complete');
    } else if (missionId === 'm04') {
      if (state.hive.armed) this.unlock('light-the-fuse');
      if (this.ui.state === 'win') this.unlock('black-sun-complete');
    }
  }

  public getRenderState(): AchievementRenderState {
    return {
      definitions: ACHIEVEMENTS,
      unlocked: this.unlocked,
      banners: this.banners.map((banner) => this.toBannerView(banner)),
    };
  }

  public reset(): void {
    this.unlocked.clear();
    this.banners.length = 0;
    this.syncStore();
  }

  private unlock(id: string): void {
    if (this.unlocked.has(id)) return;
    if (!achievementMap.has(id)) return;
    this.unlocked.add(id);
    this.syncStore();
    this.banners.push({ id, age: 0 });
    while (this.banners.length > 4) this.banners.shift();
  }

  private updateBanners(dt: number): void {
    for (let i = this.banners.length - 1; i >= 0; i -= 1) {
      const banner = this.banners[i]!;
      banner.age += dt;
      if (banner.age >= BANNER_LIFETIME) {
        this.banners.splice(i, 1);
      }
    }
  }

  private syncStore(): void {
    if (!this.ui.achievements) {
      this.ui.achievements = { unlocked: [] };
    }
    const sorted = Array.from(this.unlocked);
    sorted.sort((a, b) => {
      const orderA = ORDER_LOOKUP.get(a) ?? Number.POSITIVE_INFINITY;
      const orderB = ORDER_LOOKUP.get(b) ?? Number.POSITIVE_INFINITY;
      if (orderA === orderB) return a.localeCompare(b);
      return orderA - orderB;
    });
    this.ui.achievements.unlocked = sorted;
    this.saveUI(this.ui);
  }

  private toBannerView(banner: BannerState): AchievementBannerView {
    const def = achievementMap.get(banner.id);
    const title = def?.title ?? banner.id;
    const description = def?.description ?? '';

    let alpha = 1;
    if (banner.age < BANNER_FADE_IN) {
      alpha = Math.max(0, Math.min(1, banner.age / BANNER_FADE_IN));
    } else if (banner.age > BANNER_LIFETIME - BANNER_FADE_OUT) {
      const t = (banner.age - (BANNER_LIFETIME - BANNER_FADE_OUT)) / BANNER_FADE_OUT;
      alpha = Math.max(0, 1 - t);
    }

    const slideOffset =
      banner.age < BANNER_FADE_IN ? 1 - Math.min(1, banner.age / BANNER_FADE_IN) : 0;

    return { id: banner.id, title, description, alpha, slideOffset };
  }
}

export function createAchievementTracker(deps: AchievementTrackerDeps): AchievementTracker {
  return new AchievementTracker(deps);
}
