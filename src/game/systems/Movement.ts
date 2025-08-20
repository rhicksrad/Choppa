import type { System } from '../../core/ecs/systems';
import type { ComponentStore } from '../../core/ecs/components';
import type { Transform } from '../components/Transform';
import type { Physics } from '../components/Physics';

export class MovementSystem implements System {
  constructor(
    private transforms: ComponentStore<Transform>,
    private physics: ComponentStore<Physics>,
  ) {}

  update(dt: number): void {
    this.physics.forEach((entity, phys) => {
      const t = this.transforms.get(entity);
      if (!t) return;

      // Integrate velocity with acceleration and drag
      phys.vx += phys.ax * dt;
      phys.vy += phys.ay * dt;

      // Clamp speed
      const speed = Math.hypot(phys.vx, phys.vy);
      if (speed > phys.maxSpeed) {
        const s = phys.maxSpeed / (speed || 1);
        phys.vx *= s;
        phys.vy *= s;
      }

      // Apply drag
      const dragFactor = Math.max(0, 1 - phys.drag * dt);
      phys.vx *= dragFactor;
      phys.vy *= dragFactor;

      // Integrate position in tile space
      t.tx += phys.vx * dt;
      t.ty += phys.vy * dt;

      // Face velocity direction if moving
      if (speed > 0.001) {
        const desired = Math.atan2(phys.vy, phys.vx);
        const delta = normalizeAngle(desired - t.rot);
        const maxTurn = phys.turnRate * dt;
        const applied = Math.max(-maxTurn, Math.min(maxTurn, delta));
        t.rot = normalizeAngle(t.rot + applied);
      }
    });
  }
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
