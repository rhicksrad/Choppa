import type { InputSnapshot } from '../../../core/input/input';
import { createUIStore, type UIState, type UIStore } from '../../../ui/menus/scenes';
import type { Menu } from '../../../ui/menus/menu';
import type { KeyBindings } from '../../../ui/input-remap/bindings';
import { isDown } from '../../../ui/input-remap/bindings';
import {
  computeSettingsLayout,
  type ToggleKey,
  type VolumeSliderKey,
} from '../../../ui/menus/settingsLayout';

export interface UIControllerDeps {
  ui: UIStore;
  titleMenu: Menu;
  bindings: KeyBindings;
  canvas: HTMLCanvasElement;
  saveUI: (ui: UIStore) => void;
  applyAudioSettings: (muted: boolean) => void;
  resetGame: (missionIndex?: number) => void;
  resetCampaign: () => void;
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
  canvas,
  saveUI,
  applyAudioSettings,
  resetGame,
  resetCampaign,
  getNextMissionIndex,
  onStateChange,
}: UIControllerDeps): UIController {
  let pauseLatch = false;
  let muteLatch = false;
  let audioMuted = false;
  let settingsMouseDown = false;
  let activeSlider: VolumeSliderKey | null = null;
  let sliderDirty = false;
  let prevUIState: UIState = ui.state;
  let briefingConfirmLocked = ui.state === 'briefing';

  const changeState = (next: UIState): void => {
    if (ui.state === next) return;
    const prev = ui.state;
    if (prev === 'settings' && sliderDirty) {
      saveUI(ui);
      sliderDirty = false;
    }
    if (prev === 'settings') {
      activeSlider = null;
      settingsMouseDown = false;
    }
    ui.state = next;
    prevUIState = next;
    briefingConfirmLocked = next === 'briefing';
    onStateChange?.(next, prev);
  };

  const applySliderValue = (key: VolumeSliderKey, value: number): void => {
    const clamped = Math.max(0, Math.min(1, value));
    if (Math.abs(ui.settings[key] - clamped) < 0.001) return;
    ui.settings[key] = clamped;
    sliderDirty = true;
    applyAudioSettings(audioMuted);
  };

  const toggleSetting = (key: ToggleKey): void => {
    ui.settings[key] = !ui.settings[key];
    saveUI(ui);
  };

  const resetSettingsToDefault = (): void => {
    const defaults = createUIStore();
    ui.settings = { ...defaults.settings };
    sliderDirty = false;
    activeSlider = null;
    applyAudioSettings(audioMuted);
    saveUI(ui);
  };

  const update = (_dt: number, snapshot: InputSnapshot): boolean => {
    if (ui.state !== prevUIState) {
      prevUIState = ui.state;
      briefingConfirmLocked = ui.state === 'briefing';
    }

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
      else if (action === 'reset-progress') {
        resetCampaign();
      }
      if (action && action !== 'reset-progress') saveUI(ui);
      return false;
    }

    if (ui.state === 'settings') {
      const leftDown = (snapshot.mouseButtons & 1) !== 0;
      const leftJustPressed = leftDown && !settingsMouseDown;
      const leftJustReleased = !leftDown && settingsMouseDown;

      const rect = canvas.getBoundingClientRect();
      const pointerX = snapshot.mouseX - rect.left;
      const pointerY = snapshot.mouseY - rect.top;

      const layout = computeSettingsLayout(rect.width, rect.height);

      if (leftJustReleased && sliderDirty) {
        saveUI(ui);
        sliderDirty = false;
      }
      if (leftJustReleased) activeSlider = null;

      let pressConsumed = false;

      if (leftJustPressed) {
        for (const toggle of layout.toggles) {
          if (
            pointerX >= toggle.box.x &&
            pointerX <= toggle.box.x + toggle.box.width &&
            pointerY >= toggle.box.y &&
            pointerY <= toggle.box.y + toggle.box.height
          ) {
            toggleSetting(toggle.id);
            pressConsumed = true;
            break;
          }
        }

        if (!pressConsumed) {
          const button = layout.resetButton;
          if (
            pointerX >= button.x &&
            pointerX <= button.x + button.width &&
            pointerY >= button.y &&
            pointerY <= button.y + button.height
          ) {
            resetSettingsToDefault();
            pressConsumed = true;
          }
        }

        if (!pressConsumed) {
          for (const slider of layout.sliders) {
            const hitXMin = slider.track.x - slider.knobRadius;
            const hitXMax = slider.track.x + slider.track.width + slider.knobRadius;
            const hitYMin = slider.track.y - slider.knobRadius;
            const hitYMax = slider.track.y + slider.track.height + slider.knobRadius;
            if (
              pointerX >= hitXMin &&
              pointerX <= hitXMax &&
              pointerY >= hitYMin &&
              pointerY <= hitYMax
            ) {
              activeSlider = slider.id;
              pressConsumed = true;
              const value = (pointerX - slider.track.x) / slider.track.width;
              applySliderValue(slider.id, value);
              break;
            }
          }
        }
      }

      if (leftDown && activeSlider) {
        const slider = layout.sliders.find((s) => s.id === activeSlider);
        if (slider) {
          const value = (pointerX - slider.track.x) / slider.track.width;
          applySliderValue(slider.id, value);
        }
      }

      settingsMouseDown = leftDown;

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
      const confirmDown =
        snapshot.keys['Enter'] ||
        snapshot.keys[' '] ||
        snapshot.keys['Space'] ||
        snapshot.keys['Spacebar'];
      if (!confirmDown) briefingConfirmLocked = false;
      if (!briefingConfirmLocked && confirmDown) changeState('in-game');
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
