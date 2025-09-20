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
      const isoVx = (p.vx - p.vy) * halfW;
      const isoVy = (p.vx + p.vy) * halfH;
      const angle = Math.atan2(isoVy, isoVx);
      const speed = Math.hypot(isoVx, isoVy);
      ctx.rotate(angle);

      if (p.kind === 'missile') {
        // Feature-branch styling retained; avoids double-rotation and uses compact body.
        const bodyLength = 4.4;
        const halfWidth = 0.7;
        const tail = Math.min(4.2, 1.4 + speed * 0.01);
        const exhaust = ctx.createLinearGradient(-bodyLength / 2 - tail, 0, -bodyLength / 2, 0);
        exhaust.addColorStop(0, 'rgba(255,231,150,0)');
        exhaust.addColorStop(0.6, 'rgba(255,205,92,0.2)');
        exhaust.addColorStop(1, 'rgba(255,244,214,0.6)');
        ctx.fillStyle = exhaust;
        ctx.beginPath();
        ctx.moveTo(-bodyLength / 2 - tail, 0);
        ctx.quadraticCurveTo(
          -bodyLength / 2 - tail * 0.25,
          halfWidth * 1.1,
          -bodyLength / 2,
          halfWidth * 0.6,
        );
        ctx.lineTo(-bodyLength / 2, -halfWidth * 0.6);
        ctx.quadraticCurveTo(
          -bodyLength / 2 - tail * 0.25,
          -halfWidth * 1.1,
          -bodyLength / 2 - tail,
          0,
        );
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(-bodyLength / 2 + 0.2, -halfWidth * 0.55, bodyLength * 0.58, halfWidth * 1.1);
        ctx.fillStyle = '#ffa94d';
        ctx.fillRect(-bodyLength * 0.06, -halfWidth * 0.6, bodyLength * 0.38, halfWidth * 1.2);
        ctx.fillStyle = '#e85d04';
        ctx.beginPath();
        ctx.moveTo(bodyLength / 2, 0);
        ctx.lineTo(bodyLength * 0.38, halfWidth * 0.65);
        ctx.lineTo(bodyLength * 0.38, -halfWidth * 0.65);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === 'rocket') {
        const bodyLength = 10.8;
        const halfWidth = 2.1;
        const flameLength = Math.min(26, 7 + speed * 0.025);
        const exhaust = ctx.createLinearGradient(
          -bodyLength / 2 - flameLength,
          0,
          -bodyLength / 2,
          0,
        );
        exhaust.addColorStop(0, 'rgba(239,71,111,0)');
        exhaust.addColorStop(0.35, 'rgba(255,137,80,0.35)');
        exhaust.addColorStop(0.7, 'rgba(255,196,123,0.65)');
        exhaust.addColorStop(1, 'rgba(255,248,220,0.95)');
        ctx.fillStyle = exhaust;
        ctx.beginPath();
        ctx.moveTo(-bodyLength / 2 - flameLength, 0);
        ctx.lineTo(-bodyLength / 2 - flameLength * 0.22, halfWidth * 1.7);
        ctx.lineTo(-bodyLength / 2, halfWidth);
        ctx.lineTo(-bodyLength / 2, -halfWidth);
        ctx.lineTo(-bodyLength / 2 - flameLength * 0.22, -halfWidth * 1.7);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f1faee';
        ctx.fillRect(-bodyLength / 2, -halfWidth, bodyLength, halfWidth * 2);
        ctx.fillStyle = '#495057';
        ctx.fillRect(-bodyLength / 2 + 0.4, -halfWidth * 0.95, bodyLength * 0.65, halfWidth * 1.9);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-bodyLength * 0.1, -halfWidth * 0.9, bodyLength * 0.18, halfWidth * 1.8);

        ctx.fillStyle = '#ef476f';
        ctx.beginPath();
        ctx.moveTo(bodyLength / 2 + 2.6, 0);
        ctx.lineTo(bodyLength / 2, halfWidth * 0.95);
        ctx.lineTo(bodyLength / 2, -halfWidth * 0.95);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#343a40';
        ctx.beginPath();
        ctx.moveTo(-bodyLength / 2 + 0.1, halfWidth * 1.05);
        ctx.lineTo(-bodyLength / 2 + 2.3, halfWidth * 1.7);
        ctx.lineTo(-bodyLength / 2 + 1.1, halfWidth * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-bodyLength / 2 + 0.1, -halfWidth * 1.05);
        ctx.lineTo(-bodyLength / 2 + 2.3, -halfWidth * 1.7);
        ctx.lineTo(-bodyLength / 2 + 1.1, -halfWidth * 0.35);
        ctx.closePath();
        ctx.fill();
      } else {
        const bodyLength = 15.2;
        const halfWidth = 3.2;
        const flameLength = Math.min(38, 10 + speed * 0.03);
        const exhaust = ctx.createLinearGradient(
          -bodyLength / 2 - flameLength,
          0,
          -bodyLength / 2,
          0,
        );
        exhaust.addColorStop(0, 'rgba(116,185,255,0)');
        exhaust.addColorStop(0.25, 'rgba(116,185,255,0.25)');
        exhaust.addColorStop(0.6, 'rgba(255,214,102,0.6)');
        exhaust.addColorStop(1, 'rgba(255,245,225,0.95)');
        ctx.fillStyle = exhaust;
        ctx.beginPath();
        ctx.moveTo(-bodyLength / 2 - flameLength, 0);
        ctx.lineTo(-bodyLength / 2 - flameLength * 0.18, halfWidth * 2.1);
        ctx.lineTo(-bodyLength / 2, halfWidth);
        ctx.lineTo(-bodyLength / 2, -halfWidth);
        ctx.lineTo(-bodyLength / 2 - flameLength * 0.18, -halfWidth * 2.1);
        ctx.closePath();
        ctx.fill();

        const plume = ctx.createRadialGradient(
          -bodyLength / 2 - flameLength * 0.35,
          0,
          halfWidth * 0.3,
          -bodyLength / 2 - flameLength * 0.15,
          0,
          halfWidth * 2.2,
        );
        plume.addColorStop(0, 'rgba(255,255,255,0.8)');
        plume.addColorStop(0.45, 'rgba(255,203,107,0.45)');
        plume.addColorStop(1, 'rgba(255,71,87,0)');
        ctx.fillStyle = plume;
        ctx.beginPath();
        ctx.ellipse(
          -bodyLength / 2 - flameLength * 0.25,
          0,
          flameLength * 0.55,
          halfWidth * 2.4,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.fillStyle = '#f1f6f9';
        ctx.fillRect(-bodyLength / 2, -halfWidth, bodyLength, halfWidth * 2);
        ctx.fillStyle = '#33415c';
        ctx.fillRect(-bodyLength / 2 + 0.6, -halfWidth * 0.92, bodyLength * 0.72, halfWidth * 1.84);
        ctx.fillStyle = '#82c0ff';
        ctx.fillRect(-bodyLength * 0.05, -halfWidth * 0.85, bodyLength * 0.24, halfWidth * 1.7);

        const noseGradient = ctx.createLinearGradient(bodyLength * 0.1, 0, bodyLength / 2 + 3.2, 0);
        noseGradient.addColorStop(0, '#5dade2');
        noseGradient.addColorStop(0.7, '#a9def9');
        noseGradient.addColorStop(1, '#e0fbfc');
        ctx.fillStyle = noseGradient;
        ctx.beginPath();
        ctx.moveTo(bodyLength / 2 + 3.2, 0);
        ctx.lineTo(bodyLength / 2, halfWidth);
        ctx.lineTo(bodyLength / 2, -halfWidth);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#172a3a';
        ctx.beginPath();
        ctx.moveTo(-bodyLength / 2 + 0.2, halfWidth * 1.1);
        ctx.lineTo(-bodyLength / 2 + 2.6, halfWidth * 2.2);
        ctx.lineTo(-bodyLength / 2 + 1.2, halfWidth * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-bodyLength / 2 + 0.2, -halfWidth * 1.1);
        ctx.lineTo(-bodyLength / 2 + 2.6, -halfWidth * 2.2);
        ctx.lineTo(-bodyLength / 2 + 1.2, -halfWidth * 0.4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
