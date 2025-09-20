import type { ComponentStore } from '../../core/ecs/components';
import type { Transform } from '../components/Transform';
import type { Collider } from '../components/Collider';
import type { DamageTag } from '../components/DamageTag';

export interface Projectile {
  kind: 'rocket' | 'hellfire' | 'missile';
  faction: 'player' | 'enemy';
  x: number; // tile-space
  y: number;
  vx: number; // tiles/sec
  vy: number;
  ttl: number; // seconds
  radius: number; // collision radius
  seek?: { targetX: number; targetY: number; turnRate: number };
  damage: DamageTag;
}

/** Simple projectile pool */
export class ProjectilePool {
  private items: Projectile[] = [];

  public spawn(p: Projectile): void {
    this.items.push(p);
  }

  public clear(): void {
    this.items.length = 0;
  }

  public update(
    dt: number,
    playerColliders: ComponentStore<Collider>,
    enemyColliders: ComponentStore<Collider>,
    transforms: ComponentStore<Transform>,
    onHit: (hit: { x: number; y: number; radius: number; amount: number }) => void,
  ): void {
    const next: Projectile[] = [];
    for (let i = 0; i < this.items.length; i += 1) {
      const pr = this.items[i]!;

      // Steering for missiles
      if (pr.seek) {
        const toX = pr.seek.targetX - pr.x;
        const toY = pr.seek.targetY - pr.y;
        const toLen = Math.hypot(toX, toY) || 1;
        const ndx = toX / toLen;
        const ndy = toY / toLen;
        const curLen = Math.hypot(pr.vx, pr.vy) || 1;
        let cx = pr.vx / curLen;
        let cy = pr.vy / curLen;
        const dot = cx * ndx + cy * ndy;
        const ang = Math.acos(Math.max(-1, Math.min(1, dot)));
        const maxTurn = pr.seek.turnRate * dt;
        const t = Math.min(1, maxTurn / (ang || 1e-6));
        cx = cx + (ndx - cx) * t;
        cy = cy + (ndy - cy) * t;
        const speed = curLen; // maintain speed
        pr.vx = cx * speed;
        pr.vy = cy * speed;
      }

      // Integrate
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.ttl -= dt;
      if (pr.ttl <= 0) continue; // expired

      // Very simple collision check with colliders; stop on first hit
      let hit = false;
      const targets = pr.faction === 'player' ? enemyColliders : playerColliders;
      targets.forEach((e, c) => {
        if (hit) return;
        const t = transforms.get(e);
        if (!t) return;
        if (
          c.team &&
          ((pr.faction === 'player' && c.team === 'player') ||
            (pr.faction === 'enemy' && c.team === 'enemy'))
        )
          return;
        const dx = t.tx - pr.x;
        const dy = t.ty - pr.y;
        const r = (c.radius || 0) + pr.radius;
        if (dx * dx + dy * dy <= r * r) {
          hit = true;
          const amount = pr.damage.amount;
          const rad = pr.damage.radius ?? 0.05;
          onHit({ x: pr.x, y: pr.y, radius: rad, amount });
        }
      });
      if (!hit) next.push(pr);
    }
    this.items = next;
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    originX: number,
    originY: number,
    tileWidth: number,
    tileHeight: number,
  ): void {
    const halfW = tileWidth / 2;
    const halfH = tileHeight / 2;
    for (let i = 0; i < this.items.length; i += 1) {
      const p = this.items[i]!;
      const ix = (p.x - p.y) * halfW;
      const iy = (p.x + p.y) * halfH;
      ctx.save();
      ctx.translate(originX + ix, originY + iy - 6);
      if (p.kind === 'missile') {
        const isoVx = (p.vx - p.vy) * halfW;
        const isoVy = (p.vx + p.vy) * halfH;
        const angle = Math.atan2(isoVy, isoVx);
        const speed = Math.hypot(isoVx, isoVy);
        const flameLength = Math.min(20, 6 + speed * 0.02);
        const bodyLength = 8;
        const halfWidth = 1.6;
        ctx.rotate(angle);

        const exhaust = ctx.createLinearGradient(
          -bodyLength / 2 - flameLength,
          0,
          -bodyLength / 2,
          0,
        );
        exhaust.addColorStop(0, 'rgba(239,71,111,0)');
        exhaust.addColorStop(0.4, 'rgba(255,161,90,0.45)');
        exhaust.addColorStop(1, 'rgba(255,244,214,0.9)');
        ctx.fillStyle = exhaust;
        ctx.beginPath();
        ctx.moveTo(-bodyLength / 2 - flameLength, 0);
        ctx.lineTo(-bodyLength / 2 - flameLength * 0.25, halfWidth * 1.6);
        ctx.lineTo(-bodyLength / 2, halfWidth);
        ctx.lineTo(-bodyLength / 2, -halfWidth);
        ctx.lineTo(-bodyLength / 2 - flameLength * 0.25, -halfWidth * 1.6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f4f1de';
        ctx.fillRect(-bodyLength / 2, -halfWidth, bodyLength, halfWidth * 2);
        ctx.fillStyle = '#495057';
        ctx.fillRect(-1.1, -halfWidth, bodyLength / 2 + 1.1, halfWidth * 2);

        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.moveTo(bodyLength / 2 + 2.4, 0);
        ctx.lineTo(bodyLength / 2, halfWidth);
        ctx.lineTo(bodyLength / 2, -halfWidth);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ef476f';
        ctx.fillRect(-bodyLength / 2 + 0.2, -halfWidth * 0.9, 1.2, halfWidth * 1.8);
      } else if (p.kind === 'rocket') {
        ctx.fillStyle = '#ef476f';
        ctx.fillRect(-2, -1, 4, 2);
      } else {
        ctx.fillStyle = '#ff6f59';
        ctx.beginPath();
        ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
