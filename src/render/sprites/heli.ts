import type { IsoParams } from '../iso/projection';

export interface HeliDrawParams {
  tx: number;
  ty: number;
  rot: number;
  rotorPhase: number; // 0..1
  color: string;
  iso: IsoParams;
  originX: number;
  originY: number;
}

export function drawHeli(ctx: CanvasRenderingContext2D, p: HeliDrawParams): void {
  // Project tile position to iso pixel offset relative to map origin
  const halfW = p.iso.tileWidth / 2;
  const halfH = p.iso.tileHeight / 2;
  const ix = (p.tx - p.ty) * halfW;
  const iy = (p.tx + p.ty) * halfH;
  const x = p.originX + ix;
  const y = p.originY + iy;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.rot);

  // Shadow blob
  ctx.save();
  ctx.translate(6, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.lineJoin = 'round';

  // Tail boom
  ctx.strokeStyle = '#3b4752';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#07090b';
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.lineTo(-24, -3.2);
  ctx.lineTo(-24, 3.2);
  ctx.lineTo(-16, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tail fins
  ctx.fillStyle = '#111a22';
  ctx.beginPath();
  ctx.moveTo(-24, -3.2);
  ctx.lineTo(-29, -1.2);
  ctx.lineTo(-24, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-24, 3.2);
  ctx.lineTo(-29, 1.2);
  ctx.lineTo(-24, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tail rotor shroud
  ctx.save();
  ctx.translate(-27.5, 0);
  const tailShroudGradient = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 3.4);
  tailShroudGradient.addColorStop(0, 'rgba(30, 45, 55, 0.9)');
  tailShroudGradient.addColorStop(1, 'rgba(10, 12, 15, 0.95)');
  ctx.fillStyle = tailShroudGradient;
  ctx.strokeStyle = '#43505b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tail rotor hub and blur
  ctx.fillStyle = '#8da9bb';
  ctx.beginPath();
  ctx.arc(0, 0, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(150, 200, 230, 0.65)';
  ctx.lineWidth = 1.1;
  const tailBlades = 4;
  const tailBladeLen = 3.6;
  for (let i = 0; i < tailBlades; i += 1) {
    const ang = p.rotorPhase * Math.PI * 4 + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * tailBladeLen, Math.sin(ang) * tailBladeLen);
    ctx.stroke();
  }
  ctx.restore();

  // Fuselage core
  const fuselageGradient = ctx.createLinearGradient(-18, -12, 18, 12);
  fuselageGradient.addColorStop(0, '#050708');
  fuselageGradient.addColorStop(0.45, '#111921');
  fuselageGradient.addColorStop(1, '#202c36');
  ctx.fillStyle = fuselageGradient;
  ctx.strokeStyle = '#4a5865';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-16, -3);
  ctx.quadraticCurveTo(-2, -12, 11, -7);
  ctx.quadraticCurveTo(17, -3, 17, 0);
  ctx.quadraticCurveTo(17, 3, 11, 7);
  ctx.quadraticCurveTo(-2, 12, -16, 3);
  ctx.quadraticCurveTo(-18, 2, -18, 0);
  ctx.quadraticCurveTo(-18, -2, -16, -3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Exhaust housing
  const exhaustGradient = ctx.createLinearGradient(-18, -5, -10, 5);
  exhaustGradient.addColorStop(0, '#1b252d');
  exhaustGradient.addColorStop(1, '#2e3a45');
  ctx.fillStyle = exhaustGradient;
  ctx.strokeStyle = '#55616d';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-14, -4.5, 4.5, 9, 2);
  ctx.fill();
  ctx.stroke();

  // Engine intake
  const intakeGradient = ctx.createLinearGradient(-7, -6, -1, 6);
  intakeGradient.addColorStop(0, '#bfcbd4');
  intakeGradient.addColorStop(0.5, '#f2f7fb');
  intakeGradient.addColorStop(1, '#7d8892');
  ctx.fillStyle = intakeGradient;
  ctx.strokeStyle = '#4f5f6c';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-7, -6, 6, 12, 2.5);
  ctx.fill();
  ctx.stroke();

  // Upper spine highlight
  ctx.strokeStyle = 'rgba(180, 200, 220, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-9, -2.5);
  ctx.quadraticCurveTo(-1, -8, 9, -2);
  ctx.stroke();

  // Accent stripe
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-13, 2.4);
  ctx.quadraticCurveTo(-6, 5.4, 2, 4.2);
  ctx.stroke();

  // Cockpit glass
  const canopyGradient = ctx.createLinearGradient(0, -6, 13, 6);
  canopyGradient.addColorStop(0, 'rgba(125, 210, 255, 0.95)');
  canopyGradient.addColorStop(0.55, 'rgba(60, 140, 200, 0.85)');
  canopyGradient.addColorStop(1, 'rgba(25, 70, 120, 0.9)');
  ctx.fillStyle = canopyGradient;
  ctx.strokeStyle = 'rgba(150, 220, 255, 0.7)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-2, -5.5);
  ctx.quadraticCurveTo(9, -10, 14, -3);
  ctx.quadraticCurveTo(15, 0, 14, 3);
  ctx.quadraticCurveTo(9, 10, -2, 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Canopy frame
  ctx.strokeStyle = 'rgba(100, 150, 190, 0.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(2, -4.5);
  ctx.lineTo(10, 4);
  ctx.moveTo(2, 4.5);
  ctx.lineTo(10, -4);
  ctx.moveTo(6, -7);
  ctx.lineTo(6, 7);
  ctx.stroke();

  // Gun pods
  const gunGradient = ctx.createLinearGradient(6, -8, 18, 8);
  gunGradient.addColorStop(0, '#0c0f12');
  gunGradient.addColorStop(1, '#2d353c');
  ctx.fillStyle = gunGradient;
  ctx.strokeStyle = '#454f57';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(6, -7.5, 9, 3.5, 1.8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(6, 4, 9, 3.5, 1.8);
  ctx.fill();
  ctx.stroke();

  // Gun barrels
  ctx.fillStyle = '#c3ccd2';
  ctx.beginPath();
  ctx.roundRect(15, -6.6, 4.5, 1.4, 0.7);
  ctx.roundRect(15, 5.2, 4.5, 1.4, 0.7);
  ctx.fill();
  ctx.fillStyle = '#7a848c';
  ctx.fillRect(19.3, -6.2, 3.2, 0.8);
  ctx.fillRect(19.3, 5.6, 3.2, 0.8);

  // Underbelly lights
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.arc(-2, 7.5, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(-6, -7.2, 1, 0, Math.PI * 2);
  ctx.fill();

  // Rotor hub
  ctx.fillStyle = '#2f3a44';
  ctx.strokeStyle = '#5d6b75';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Rotor (simple line sweep)
  const bladeLen = 18;
  const blades = 2;
  ctx.strokeStyle = '#9cc9e4';
  ctx.lineWidth = 2;
  for (let i = 0; i < blades; i += 1) {
    const ang = p.rotorPhase * Math.PI * 2 + (i * Math.PI) / 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * bladeLen, Math.sin(ang) * bladeLen);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawPad(
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
  const x = originX + ix;
  const y = originY + iy;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#1f3b4d';
  ctx.strokeStyle = '#92ffa6';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, -halfH);
  ctx.lineTo(halfW, 0);
  ctx.lineTo(0, halfH);
  ctx.lineTo(-halfW, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
