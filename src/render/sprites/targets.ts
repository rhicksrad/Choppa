import type { IsoParams } from '../iso/projection';

function drawRotor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  bladeColor: string,
  hubColor: string,
  highlightColor?: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = bladeColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  if (highlightColor) {
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.8, radius * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = hubColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

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

  ctx.fillStyle = '#252a33';
  ctx.beginPath();
  ctx.moveTo(-20, 9);
  ctx.lineTo(0, -3);
  ctx.lineTo(20, 9);
  ctx.lineTo(0, 21);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2f3540';
  ctx.beginPath();
  ctx.moveTo(-16, 8);
  ctx.lineTo(0, 0);
  ctx.lineTo(16, 8);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#414956';
  ctx.beginPath();
  ctx.ellipse(0, -2, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#636d7a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -2, 13, 8, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#1e232b';
  ctx.beginPath();
  ctx.roundRect(-11, -15, 22, 14, 5);
  ctx.fill();

  ctx.fillStyle = '#2a303b';
  ctx.beginPath();
  ctx.roundRect(-9, -13, 18, 10, 4);
  ctx.fill();

  ctx.fillStyle = '#10141a';
  ctx.beginPath();
  ctx.roundRect(-6, -12, 12, 8, 3);
  ctx.fill();

  ctx.fillStyle = '#59616d';
  ctx.beginPath();
  ctx.arc(0, -8, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4b545f';
  ctx.beginPath();
  ctx.arc(-12, 12, 2, 0, Math.PI * 2);
  ctx.arc(12, 12, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3b424d';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-5, -10);
  ctx.lineTo(-13, -24);
  ctx.moveTo(5, -10);
  ctx.lineTo(13, -24);
  ctx.stroke();

  ctx.strokeStyle = '#a3acb9';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-5, -12);
  ctx.lineTo(-14, -30);
  ctx.moveTo(5, -12);
  ctx.lineTo(14, -30);
  ctx.stroke();

  ctx.fillStyle = '#ccd3db';
  ctx.beginPath();
  ctx.arc(-14, -30, 2, 0, Math.PI * 2);
  ctx.arc(14, -30, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'butt';
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
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2b3648';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, -3);
  ctx.lineTo(12, 1);
  ctx.moveTo(-3, -11);
  ctx.lineTo(1, 11);
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.fillStyle = '#42526a';
  ctx.strokeStyle = '#1d2533';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-6, -5, 12, 10, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#b5c8df';
  ctx.beginPath();
  ctx.arc(0, -1, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#e0ecff';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -1, 4, 0, Math.PI * 2);
  ctx.stroke();

  drawRotor(ctx, -12, -4, 3.6, '#2a3649', '#d0e1f8');
  drawRotor(ctx, 12, 2, 3.6, '#2a3649', '#d0e1f8');
  drawRotor(ctx, -4, 11, 3.2, '#2a3649', '#d0e1f8');
  drawRotor(ctx, 4, -11, 3.2, '#2a3649', '#d0e1f8');
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
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3a1624';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(14, 2);
  ctx.moveTo(-4, -14);
  ctx.lineTo(2, 14);
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.strokeStyle = '#532338';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-9, -1);
  ctx.lineTo(9, 3);
  ctx.moveTo(-1, -9);
  ctx.lineTo(3, 9);
  ctx.stroke();

  ctx.fillStyle = '#5a2f43';
  ctx.strokeStyle = '#2a0f1c';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(-7, -6, 14, 12, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ff8b7d';
  ctx.beginPath();
  ctx.arc(0, -1.5, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -1.5, 4.6, 0, Math.PI * 2);
  ctx.stroke();

  drawRotor(ctx, -14, -5, 4.2, '#31111d', '#ffccd2');
  drawRotor(ctx, 14, 3, 4.2, '#31111d', '#ffccd2');
  drawRotor(ctx, -5, 14, 3.8, '#31111d', '#ffccd2');
  drawRotor(ctx, 5, -14, 3.8, '#31111d', '#ffccd2');
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
  ctx.ellipse(0, 12, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1b1029';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-16, -5);
  ctx.lineTo(16, 3);
  ctx.moveTo(-5, -16);
  ctx.lineTo(3, 16);
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.strokeStyle = '#2e1a44';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-11, -1);
  ctx.lineTo(11, 5);
  ctx.moveTo(-1, -11);
  ctx.lineTo(5, 11);
  ctx.stroke();

  ctx.fillStyle = '#211733';
  ctx.strokeStyle = '#8dfcff';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.roundRect(-7, -7, 14, 14, 5);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#3a2753';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-5, -5, 10, 10, 4);
  ctx.stroke();

  ctx.fillStyle = '#4be0ff';
  ctx.beginPath();
  ctx.arc(0, -2, 3.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#c6fff7';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -2, 5.6, 0, Math.PI * 2);
  ctx.stroke();

  drawRotor(ctx, -16, -6, 4.8, '#251736', '#aefcff', '#6bf7ff');
  drawRotor(ctx, 16, 4, 4.8, '#251736', '#aefcff', '#6bf7ff');
  drawRotor(ctx, -6, 16, 4.4, '#251736', '#aefcff', '#6bf7ff');
  drawRotor(ctx, 6, -16, 4.4, '#251736', '#aefcff', '#6bf7ff');

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

  const groundGlow = ctx.createRadialGradient(0, 6, 2, 0, 6, 24);
  groundGlow.addColorStop(0, 'rgba(68, 255, 219, 0.3)');
  groundGlow.addColorStop(1, 'rgba(68, 255, 219, 0)');
  ctx.fillStyle = groundGlow;
  ctx.beginPath();
  ctx.ellipse(0, 6, 24, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  const cubicPoint = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  };
  const cubicTangent = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
    const mt = 1 - t;
    return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2);
  };

  interface TentacleSpec {
    startX: number;
    startY: number;
    ctrl1X: number;
    ctrl1Y: number;
    ctrl2X: number;
    ctrl2Y: number;
    endX: number;
    endY: number;
    width: number;
    color: string;
    highlight: string;
    front: boolean;
  }

  const tentacles: TentacleSpec[] = [
    {
      startX: -4,
      startY: 4,
      ctrl1X: -18,
      ctrl1Y: 16,
      ctrl2X: -32,
      ctrl2Y: 28,
      endX: -30,
      endY: 42,
      width: 5.5,
      color: '#4dffe1',
      highlight: '#b9fff5',
      front: false,
    },
    {
      startX: 4,
      startY: 4,
      ctrl1X: 18,
      ctrl1Y: 16,
      ctrl2X: 32,
      ctrl2Y: 28,
      endX: 30,
      endY: 42,
      width: 5.5,
      color: '#4dffe1',
      highlight: '#b9fff5',
      front: false,
    },
    {
      startX: -2,
      startY: 6,
      ctrl1X: -12,
      ctrl1Y: 20,
      ctrl2X: -18,
      ctrl2Y: 34,
      endX: -12,
      endY: 44,
      width: 5,
      color: '#66ffec',
      highlight: '#dbfffa',
      front: false,
    },
    {
      startX: 2,
      startY: 6,
      ctrl1X: 12,
      ctrl1Y: 20,
      ctrl2X: 18,
      ctrl2Y: 34,
      endX: 12,
      endY: 44,
      width: 5,
      color: '#66ffec',
      highlight: '#dbfffa',
      front: false,
    },
    {
      startX: -6,
      startY: 2,
      ctrl1X: -22,
      ctrl1Y: 12,
      ctrl2X: -28,
      ctrl2Y: 24,
      endX: -24,
      endY: 32,
      width: 6.5,
      color: '#6bfff0',
      highlight: '#e5fffb',
      front: true,
    },
    {
      startX: 6,
      startY: 2,
      ctrl1X: 22,
      ctrl1Y: 12,
      ctrl2X: 28,
      ctrl2Y: 24,
      endX: 24,
      endY: 32,
      width: 6.5,
      color: '#6bfff0',
      highlight: '#e5fffb',
      front: true,
    },
    {
      startX: 0,
      startY: 4,
      ctrl1X: 0,
      ctrl1Y: 20,
      ctrl2X: -4,
      ctrl2Y: 32,
      endX: -2,
      endY: 40,
      width: 7,
      color: '#54ffe7',
      highlight: '#d3fffa',
      front: true,
    },
    {
      startX: 0,
      startY: 4,
      ctrl1X: 0,
      ctrl1Y: 20,
      ctrl2X: 4,
      ctrl2Y: 32,
      endX: 2,
      endY: 40,
      width: 7,
      color: '#54ffe7',
      highlight: '#d3fffa',
      front: true,
    },
  ];

  const drawTentacle = (spec: TentacleSpec): void => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = spec.width;
    ctx.strokeStyle = spec.color;
    ctx.globalAlpha = spec.front ? 0.95 : 0.8;
    ctx.beginPath();
    ctx.moveTo(spec.startX, spec.startY);
    ctx.bezierCurveTo(spec.ctrl1X, spec.ctrl1Y, spec.ctrl2X, spec.ctrl2Y, spec.endX, spec.endY);
    ctx.stroke();

    ctx.globalAlpha = spec.front ? 0.65 : 0.45;
    ctx.lineWidth = spec.width * 0.45;
    ctx.strokeStyle = spec.highlight;
    ctx.beginPath();
    ctx.moveTo(spec.startX + 0.4, spec.startY - 0.6);
    ctx.bezierCurveTo(
      spec.ctrl1X * 0.85,
      spec.ctrl1Y * 0.85,
      spec.ctrl2X * 0.85,
      spec.ctrl2Y * 0.85,
      spec.endX * 0.9,
      spec.endY * 0.9,
    );
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(240, 255, 254, 0.55)';
    const cups = spec.front ? 4 : 3;
    for (let i = 1; i <= cups; i += 1) {
      const t = i / (cups + 1);
      const px = cubicPoint(spec.startX, spec.ctrl1X, spec.ctrl2X, spec.endX, t);
      const py = cubicPoint(spec.startY, spec.ctrl1Y, spec.ctrl2Y, spec.endY, t);
      const tx = cubicTangent(spec.startX, spec.ctrl1X, spec.ctrl2X, spec.endX, t);
      const ty = cubicTangent(spec.startY, spec.ctrl1Y, spec.ctrl2Y, spec.endY, t);
      const angle = Math.atan2(ty, tx);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.scale(1, 0.6);
      ctx.beginPath();
      ctx.arc(0, 0, spec.front ? 1.8 : 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  tentacles
    .filter((spec) => !spec.front)
    .forEach((spec) => {
      drawTentacle(spec);
    });

  const bodyGradient = ctx.createLinearGradient(0, -24, 0, 18);
  bodyGradient.addColorStop(0, '#2d0b45');
  bodyGradient.addColorStop(0.4, '#46196f');
  bodyGradient.addColorStop(0.8, '#30114c');
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.bezierCurveTo(-16, -22, -20, -8, -12, 14);
  ctx.bezierCurveTo(-6, 26, 6, 26, 12, 14);
  ctx.bezierCurveTo(20, -8, 16, -22, 0, -24);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#7a43cf';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  const bellyGlow = ctx.createRadialGradient(-4, -6, 0, 0, -2, 16);
  bellyGlow.addColorStop(0, 'rgba(145, 255, 235, 0.9)');
  bellyGlow.addColorStop(0.5, 'rgba(120, 220, 255, 0.4)');
  bellyGlow.addColorStop(1, 'rgba(48, 8, 78, 0)');
  ctx.fillStyle = bellyGlow;
  ctx.beginPath();
  ctx.ellipse(0, -2, 12, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#14061f';
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.bezierCurveTo(-5, 4, -2, 7, 0, 8);
  ctx.bezierCurveTo(2, 7, 5, 4, 6, -2);
  ctx.bezierCurveTo(2, -6, -2, -6, -6, -2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ff6ac6';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-4.5, 0);
  ctx.quadraticCurveTo(0, 3.6, 4.5, 0);
  ctx.stroke();

  ctx.fillStyle = '#fefbff';
  ctx.beginPath();
  ctx.ellipse(-5.5, -10, 2.5, 3.2, -0.1, 0, Math.PI * 2);
  ctx.ellipse(0, -12, 3, 3.6, 0, 0, Math.PI * 2);
  ctx.ellipse(5.5, -10, 2.5, 3.2, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#37ffd0';
  ctx.beginPath();
  ctx.ellipse(-5.5, -10, 1.4, 1.7, -0.1, 0, Math.PI * 2);
  ctx.ellipse(0, -12, 1.6, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(5.5, -10, 1.4, 1.7, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#071a1c';
  ctx.beginPath();
  ctx.ellipse(-5.5, -9.6, 0.7, 0.9, -0.1, 0, Math.PI * 2);
  ctx.ellipse(0, -11.6, 0.8, 1, 0, 0, Math.PI * 2);
  ctx.ellipse(5.5, -9.6, 0.7, 0.9, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#9ffff2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.quadraticCurveTo(-7, -6, -4, 8);
  ctx.moveTo(0, -18);
  ctx.quadraticCurveTo(7, -6, 4, 8);
  ctx.moveTo(-2, 2);
  ctx.quadraticCurveTo(-1, 10, -2, 16);
  ctx.moveTo(2, 2);
  ctx.quadraticCurveTo(1, 10, 2, 16);
  ctx.stroke();

  ctx.strokeStyle = '#5fffe8';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-8, -14);
  ctx.quadraticCurveTo(-6, -20, -2, -24);
  ctx.moveTo(8, -14);
  ctx.quadraticCurveTo(6, -20, 2, -24);
  ctx.stroke();

  ctx.fillStyle = '#63fff2';
  ctx.beginPath();
  ctx.arc(-2.4, -24, 1.6, 0, Math.PI * 2);
  ctx.arc(2.4, -24, 1.6, 0, Math.PI * 2);
  ctx.fill();

  tentacles
    .filter((spec) => spec.front)
    .forEach((spec) => {
      drawTentacle(spec);
    });

  const innerAura = ctx.createRadialGradient(0, -6, 0, 0, -6, 18);
  innerAura.addColorStop(0, 'rgba(150, 255, 240, 0.8)');
  innerAura.addColorStop(1, 'rgba(80, 20, 120, 0)');
  ctx.fillStyle = innerAura;
  ctx.beginPath();
  ctx.ellipse(0, -4, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
