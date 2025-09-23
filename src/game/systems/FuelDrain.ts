import type { System } from '../../core/ecs/systems';
import type { ComponentStore } from '../../core/ecs/components';
import type { Fuel } from '../components/Fuel';

export class FuelDrainSystem implements System {
  constructor(private fuels: ComponentStore<Fuel>) {}

  update(dt: number): void {
    this.fuels.forEach((_e, f) => {
      f.current = Math.max(0, f.current - dt * 0.85); // steeper baseline drain
    });
  }
}
