import type { System } from '../../core/ecs/systems';
import type { ComponentStore } from '../../core/ecs/components';
import type { Fuel } from '../components/Fuel';
import type { Transform } from '../components/Transform';

export interface RefuelPad {
  tx: number;
  ty: number;
  radius: number; // in tiles
}

export class RefuelRearmSystem implements System {
  constructor(
    private transforms: ComponentStore<Transform>,
    private fuels: ComponentStore<Fuel>,
    private pads: RefuelPad[],
  ) {}

  update(dt: number): void {
    this.transforms.forEach((entity, t) => {
      const fuel = this.fuels.get(entity);
      if (!fuel) return;
      for (let i = 0; i < this.pads.length; i += 1) {
        const p = this.pads[i]!;
        const dx = t.tx - p.tx;
        const dy = t.ty - p.ty;
        const dist = Math.hypot(dx, dy);
        if (dist <= p.radius) {
          fuel.current = Math.min(fuel.max, fuel.current + dt * (fuel.max * 0.5));
          break;
        }
      }
    });
  }
}
