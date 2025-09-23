import type { IsoParams } from '../iso/projection';

export function drawAAATurret(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  tx: number,
  ty: number,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (tx - ty) * halfW;
  const iy = (tx + ty) * halfH;
  ctx.save();
  ctx.translate(originX + ix, originY + iy);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1c1030';
  ctx.beginPath();
  ctx.moveTo(-16, 8);
  ctx.lineTo(0, -10);
  ctx.lineTo(16, 8);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#63fce0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, -2, 11, 6, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#2a1548';
  ctx.beginPath();
  ctx.roundRect(-9, -16, 18, 16, 6);
  ctx.fill();

  ctx.fillStyle = '#9bfff1';
  ctx.beginPath();
  ctx.arc(0, -8, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#c7a4ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-11, -3);
  ctx.lineTo(-20, -11);
  ctx.moveTo(11, -3);
  ctx.lineTo(20, -11);
  ctx.stroke();

  ctx.strokeStyle = '#6dfcdf';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(0, -26);
  ctx.moveTo(-5, -14);
  ctx.lineTo(-7, -22);
  ctx.moveTo(5, -14);
  ctx.lineTo(7, -22);
  ctx.stroke();
  ctx.restore();
}

export function drawSAM(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  tx: number,
  ty: number,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (tx - ty) * halfW;
  const iy = (tx + ty) * halfH;
  ctx.save();
  ctx.translate(originX + ix, originY + iy);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111b36';
  ctx.beginPath();
  ctx.moveTo(-20, 10);
  ctx.lineTo(0, -16);
  ctx.lineTo(20, 10);
  ctx.lineTo(0, 20);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1f2e57';
  ctx.beginPath();
  ctx.moveTo(-14, 8);
  ctx.lineTo(0, -6);
  ctx.lineTo(14, 8);
  ctx.lineTo(0, 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2a1552';
  ctx.beginPath();
  ctx.roundRect(-12, -22, 24, 20, 8);
  ctx.fill();

  ctx.fillStyle = '#7ff4ff';
  ctx.beginPath();
  ctx.roundRect(-7, -18, 14, 12, 4);
  ctx.fill();

  ctx.fillStyle = '#3a1d60';
  ctx.beginPath();
  ctx.moveTo(-17, 6);
  ctx.lineTo(-25, -8);
  ctx.lineTo(-13, -14);
  ctx.closePath();
  ctx.moveTo(17, 6);
  ctx.lineTo(25, -8);
  ctx.lineTo(13, -14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#96fff6';
  ctx.beginPath();
  ctx.arc(0, -24, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#63fce0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(0, -34);
  ctx.stroke();
  ctx.restore();
}

export function drawPatrolDrone(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  tx: number,
  ty: number,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (tx - ty) * halfW;
  const iy = (tx + ty) * halfH;
  ctx.save();
  ctx.translate(originX + ix, originY + iy);
  ctx.fillStyle = '#3e4c65';
  ctx.strokeStyle = '#1d2533';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-5, -4, 10, 8, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9fb3c8';
  ctx.fillRect(-2, -8, 4, 4);
  ctx.restore();
}

export function drawChaserDrone(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  tx: number,
  ty: number,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (tx - ty) * halfW;
  const iy = (tx + ty) * halfH;
  ctx.save();
  ctx.translate(originX + ix, originY + iy);
  ctx.fillStyle = '#5a2f43';
  ctx.strokeStyle = '#2a0f1c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-5, -5, 10, 10, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(0, -2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawSentinelDrone(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  tx: number,
  ty: number,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (tx - ty) * halfW;
  const iy = (tx + ty) * halfH;
  ctx.save();
  ctx.translate(originX + ix, originY + iy);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#211733';
  ctx.strokeStyle = '#8dfcff';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(-6, -6, 12, 12, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4be0ff';
  ctx.beginPath();
  ctx.arc(0, -2, 3.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#c6fff7';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(-10, 2);
  ctx.moveTo(6, -2);
  ctx.lineTo(10, 2);
  ctx.stroke();

  ctx.restore();
}

export function drawObeliskTurret(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  tx: number,
  ty: number,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (tx - ty) * halfW;
  const iy = (tx + ty) * halfH;
  ctx.save();
  ctx.translate(originX + ix, originY + iy);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#120b22';
  ctx.beginPath();
  ctx.moveTo(-8, 10);
  ctx.lineTo(0, -20);
  ctx.lineTo(8, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2b1b3f';
  ctx.beginPath();
  ctx.moveTo(-5, 8);
  ctx.lineTo(0, -14);
  ctx.lineTo(5, 8);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#78f7ff';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(0, -26);
  ctx.stroke();

  ctx.fillStyle = '#9bffe8';
  ctx.beginPath();
  ctx.arc(0, -28, 4.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawSpeedboat(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  tx: number,
  ty: number,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (tx - ty) * halfW;
  const iy = (tx + ty) * halfH;
  ctx.save();
  ctx.translate(originX + ix, originY + iy);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1b2a3f';
  ctx.strokeStyle = '#91d8ff';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(12, 8);
  ctx.quadraticCurveTo(0, 16, -12, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#2f4d6a';
  ctx.beginPath();
  ctx.roundRect(-8, -6, 16, 10, 3);
  ctx.fill();

  ctx.fillStyle = '#c3f2ff';
  ctx.beginPath();
  ctx.roundRect(-5, -4, 10, 6, 2);
  ctx.fill();

  ctx.strokeStyle = '#63fce0';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(0, -16);
  ctx.moveTo(-3, -9);
  ctx.lineTo(-5, -14);
  ctx.moveTo(3, -9);
  ctx.lineTo(5, -14);
  ctx.stroke();
  ctx.restore();
}

export function drawAlienMonstrosity(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  tx: number,
  ty: number,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (tx - ty) * halfW;
  const iy = (tx + ty) * halfH;
  ctx.save();
  ctx.translate(originX + ix, originY + iy);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw writhing tentacles.
  ctx.strokeStyle = '#51ffda';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (i - 2) * (Math.PI / 9);
    const length = 18 + Math.abs(i - 2) * 4;
    const spreadX = Math.cos(angle) * length;
    const spreadY = Math.sin(angle) * length;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.quadraticCurveTo(spreadX * 0.2, 16, spreadX, spreadY + 8);
    ctx.stroke();
  }

  // Alien body core.
  ctx.fillStyle = '#2c1146';
  ctx.beginPath();
  ctx.ellipse(0, -2, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#431a6b';
  ctx.beginPath();
  ctx.ellipse(0, -4, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bioluminescent veins.
  ctx.strokeStyle = '#9ffff2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.quadraticCurveTo(-6, -4, -2, 6);
  ctx.moveTo(0, -12);
  ctx.quadraticCurveTo(6, -4, 2, 6);
  ctx.stroke();

  // Clustered eyes.
  ctx.fillStyle = '#fdf6ff';
  ctx.beginPath();
  ctx.arc(-4, -8, 2.5, 0, Math.PI * 2);
  ctx.arc(0, -10, 3, 0, Math.PI * 2);
  ctx.arc(4, -8, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3fffc7';
  ctx.beginPath();
  ctx.arc(-4, -8, 1.2, 0, Math.PI * 2);
  ctx.arc(0, -10, 1.4, 0, Math.PI * 2);
  ctx.arc(4, -8, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Maw.
  ctx.fillStyle = '#0a020f';
  ctx.beginPath();
  ctx.ellipse(0, -2, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#f05f9f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -2);
  ctx.lineTo(5, -2);
  ctx.stroke();

  // Inner glow to emphasize alien energy.
  const gradient = ctx.createRadialGradient(0, -6, 0, 0, -6, 12);
  gradient.addColorStop(0, 'rgba(140, 255, 235, 0.9)');
  gradient.addColorStop(1, 'rgba(80, 20, 120, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, -4, 12, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
