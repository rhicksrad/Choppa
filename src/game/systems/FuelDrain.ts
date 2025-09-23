import type { System } from '../../core/ecs/systems';
import type { ComponentStore } from '../../core/ecs/components';
import type { Fuel } from '../components/Fuel';
import type { Health } from '../components/Health';
import type { DamageSystem } from './Damage';

export class FuelDrainSystem implements System {
  constructor(
    private fuels: ComponentStore<Fuel>,
    private healths: ComponentStore<Health>,
    private damage: DamageSystem,
  ) {}

  update(dt: number): void {
    this.fuels.forEach((entity, f) => {
      const previous = f.current;
      f.current = Math.max(0, f.current - dt * 0.85); // steeper baseline drain
      if (previous > 0 && f.current <= 0) {
        const health = this.healths.get(entity);
        if (health && health.current > 0) {
          this.damage.kill(entity);
        }
      }
    });
  }
}
