import type { System } from '../../core/ecs/systems';
import type { ComponentStore } from '../../core/ecs/components';
import type { Sprite } from '../components/Sprite';

export class RotorSpinSystem implements System {
  constructor(private sprites: ComponentStore<Sprite>) {}

  update(dt: number): void {
    this.sprites.forEach((_e, s) => {
      s.rotor = (s.rotor + dt * 4) % 1; // spin speed placeholder
    });
  }
}
