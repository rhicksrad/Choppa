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
  onStateChange?: (next: UIState, prev: UIState) => void;
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
  onStateChange,
}: UIControllerDeps): UIController {
  let pauseLatch = false;
  let muteLatch = false;
  let audioMuted = false;

  const changeState = (next: UIState): void => {
    if (ui.state === next) return;
    const prev = ui.state;
    ui.state = next;
    onStateChange?.(next, prev);
  };

  const update = (_dt: number, snapshot: InputSnapshot): boolean => {
    const pauseDown = isDown(snapshot, bindings, 'pause');
    if (pauseDown && !pauseLatch) {
      if (ui.state === 'in-game') changeState('paused');
      else if (ui.state === 'paused') changeState('in-game');
      else if (ui.state === 'title') changeState('in-game');
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
      } else if (action === 'settings') changeState('settings');
      else if (action === 'achievements') changeState('achievements');
      else if (action === 'about') changeState('about');
      if (action) saveUI(ui);
      return false;
    }

    if (ui.state === 'settings') {
      if (snapshot.keys['Escape']) changeState('title');
      return false;
    }

    if (ui.state === 'achievements') {
      if (snapshot.keys['Escape']) changeState('title');
      return false;
    }

    if (ui.state === 'about') {
      if (snapshot.keys['Escape']) changeState('title');
      return false;
    }

    if (ui.state === 'briefing') {
      if (snapshot.keys['Enter'] || snapshot.keys[' '] || snapshot.keys['Space'])
        changeState('in-game');
      return false;
    }

    if (ui.state === 'paused') {
      if (snapshot.keys['Escape']) changeState('in-game');
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
      if (snapshot.keys['Escape']) changeState('title');
      return false;
    }

    if (ui.state === 'win') {
      if (snapshot.keys['Enter'] || snapshot.keys[' ']) resetGame(getNextMissionIndex());
      if (snapshot.keys['Escape']) changeState('title');
      return false;
    }

    return true;
  };

  return {
    update,
    isAudioMuted: () => audioMuted,
  };
}
