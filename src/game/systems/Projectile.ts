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
      if (pr.ttl <= 0) {
        if (pr.kind === 'missile') {
          const amount = pr.damage.amount;
          const rad = pr.damage.radius ?? 0.05;
          onHit({ x: pr.x, y: pr.y, radius: rad, amount });
        }
        continue; // expired
      }

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
        const dirScreenX = (p.vx - p.vy) * halfW;
        const dirScreenY = (p.vx + p.vy) * halfH;
        const dirLen = Math.hypot(dirScreenX, dirScreenY) || 1;
        const tailLength = Math.min(12, dirLen * 0.18);
        ctx.strokeStyle = '#ffba08';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-dirScreenX / dirLen * tailLength, -dirScreenY / dirLen * tailLength);
        ctx.stroke();
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
        ctx.fill();
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
