import type { InputSnapshot } from '../../../core/input/input';
import type { UIStore } from '../../../ui/menus/scenes';
import type { Menu } from '../../../ui/menus/menu';
import type { KeyBindings } from '../../../ui/input-remap/bindings';
import { isDown } from '../../../ui/input-remap/bindings';

export interface UIControllerDeps {
  ui: UIStore;
  titleMenu: Menu;
  bindings: KeyBindings;
  saveUI: (ui: UIStore) => void;
  applyAudioSettings: (muted: boolean) => void;
  resetGame: (missionIndex?: number) => void;
  getNextMissionIndex: () => number;
}

export interface UIController {
  update: (dt: number, snapshot: InputSnapshot) => boolean;
  isAudioMuted: () => boolean;
}

export function createUIController({
  ui,
  titleMenu,
  bindings,
  saveUI,
  applyAudioSettings,
  resetGame,
  getNextMissionIndex,
}: UIControllerDeps): UIController {
  let pauseLatch = false;
  let muteLatch = false;
  let audioMuted = false;

  const update = (_dt: number, snapshot: InputSnapshot): boolean => {
    const pauseDown = isDown(snapshot, bindings, 'pause');
    if (pauseDown && !pauseLatch) {
      if (ui.state === 'in-game') ui.state = 'paused';
      else if (ui.state === 'paused') ui.state = 'in-game';
      else if (ui.state === 'title') ui.state = 'in-game';
    }
    pauseLatch = pauseDown;

    const muteDown = snapshot.keys['m'] || snapshot.keys['M'];
    if (muteDown && !muteLatch) {
      audioMuted = !audioMuted;
      applyAudioSettings(audioMuted);
    }
    muteLatch = muteDown;

    if (ui.state === 'title') {
      const action = titleMenu.update(snapshot);
      if (action === 'start') {
        resetGame();
      } else if (action === 'settings') ui.state = 'settings';
      else if (action === 'achievements') ui.state = 'achievements';
      else if (action === 'about') ui.state = 'about';
      if (action) saveUI(ui);
      return false;
    }

    if (ui.state === 'settings') {
      if (snapshot.keys['Escape']) ui.state = 'title';
      return false;
    }

    if (ui.state === 'achievements') {
      if (snapshot.keys['Escape']) ui.state = 'title';
      return false;
    }

    if (ui.state === 'about') {
      if (snapshot.keys['Escape']) ui.state = 'title';
      return false;
    }

    if (ui.state === 'briefing') {
      if (snapshot.keys['Enter'] || snapshot.keys[' '] || snapshot.keys['Space'])
        ui.state = 'in-game';
      return false;
    }

    if (ui.state === 'paused') {
      if (snapshot.keys['Escape']) ui.state = 'in-game';
      return false;
    }

    if (ui.state === 'game-over') {
      if (
        snapshot.keys['Enter'] ||
        snapshot.keys[' '] ||
        snapshot.keys['r'] ||
        snapshot.keys['R']
      ) {
        resetGame();
      }
      if (snapshot.keys['Escape']) ui.state = 'title';
      return false;
    }

    if (ui.state === 'win') {
      if (snapshot.keys['Enter'] || snapshot.keys[' ']) resetGame(getNextMissionIndex());
      if (snapshot.keys['Escape']) ui.state = 'title';
      return false;
    }

    return true;
  };

  return {
    update,
    isAudioMuted: () => audioMuted,
  };
}
