import type { InputSnapshot } from '../../core/input/input';
import { loadJson, saveJson } from '../../core/util/storage';

export type Action = 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight' | 'pause';

export type KeyBindings = Record<Action, string[]>; // array of key values

const STORAGE_KEY = 'vinestrike:bindings';

export function defaultBindings(): KeyBindings {
  return {
    moveUp: ['w', 'W', 'ArrowUp'],
    moveDown: ['s', 'S', 'ArrowDown'],
    moveLeft: ['a', 'A', 'ArrowLeft'],
    moveRight: ['d', 'D', 'ArrowRight'],
    pause: ['Escape'],
  };
}

export function loadBindings(): KeyBindings {
  return loadJson<KeyBindings>(STORAGE_KEY, defaultBindings());
}

export function saveBindings(b: KeyBindings): void {
  saveJson(STORAGE_KEY, b);
}

export function isDown(snap: InputSnapshot, bindings: KeyBindings, action: Action): boolean {
  const keys = bindings[action] || [];
  for (let i = 0; i < keys.length; i += 1) {
    if (snap.keys[keys[i]!] === true) return true;
  }
  return false;
}
