export type UIState =
  | 'title'
  | 'settings'
  | 'achievements'
  | 'about'
  | 'briefing'
  | 'in-game'
  | 'paused'
  | 'win'
  | 'game-over';

export interface SettingsState {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  fogOfWar: boolean;
  minimap: boolean;
}

export interface AchievementsState {
  unlocked: string[]; // ids
}

export interface UIStore {
  state: UIState;
  settings: SettingsState;
  achievements: AchievementsState;
}

export function createUIStore(): UIStore {
  return {
    state: 'title',
    settings: {
      masterVolume: 0.9,
      musicVolume: 0.7,
      sfxVolume: 1,
      screenShake: true,
      fogOfWar: true,
      minimap: true,
    },
    achievements: { unlocked: [] },
  };
}
