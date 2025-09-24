import type { IsoParams } from '../iso/projection';

export interface BuildingDraw {
  tx: number;
  ty: number;
  width: number;
  depth: number;
  height: number;
  bodyColor: string;
  roofColor: string;
  ruinColor?: string;
  damage01: number;
}

export interface TeslaTowerDraw {
  tx: number;
  ty: number;
  width: number;
  depth: number;
  height: number;
  damage01: number;
}

export interface SynapseClusterDraw {
  tx: number;
  ty: number;
  width: number;
  depth: number;
  height: number;
  damage01: number;
}

export interface ShieldPylonDraw {
  tx: number;
  ty: number;
  width: number;
  depth: number;
  height: number;
  damage01: number;
}

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  params: BuildingDraw,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (params.tx - params.ty) * halfW;
  const iy = (params.tx + params.ty) * halfH;
  const x = originX + ix;
  const y = originY + iy;

  const sx = halfW * params.width * 0.5;
  const sy = halfH * params.depth * 0.5;
  const h = params.height;

  ctx.save();
  ctx.translate(x, y);

  const shade = adjustShade(params.bodyColor, -12);
  const highlight = adjustShade(params.bodyColor, 10);
  const ruinOverlay = params.ruinColor ?? '#3b2f2f';

  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.moveTo(0, sy);
  ctx.lineTo(sx, sy * 0.6);
  ctx.lineTo(sx, sy * 0.6 + h * 0.25);
  ctx.lineTo(0, sy + h * 0.25);
  ctx.closePath();
  ctx.fill();

  // left wall
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-sx, sy);
  ctx.lineTo(-sx, sy - h);
  ctx.lineTo(0, -h);
  ctx.closePath();
  ctx.fill();

  // right wall
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(sx, sy * 0.6);
  ctx.lineTo(sx, sy * 0.6 - h);
  ctx.lineTo(0, -h);
  ctx.closePath();
  ctx.fill();

  // front wall
  ctx.fillStyle = params.bodyColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(sx, sy * 0.6);
  ctx.lineTo(0, sy + sy * 0.2);
  ctx.lineTo(-sx, sy);
  ctx.closePath();
  ctx.fill();

  // roof
  ctx.fillStyle = params.roofColor;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(-sx, sy - h);
  ctx.lineTo(0, sy + sy * 0.2 - h * 0.5);
  ctx.lineTo(sx, sy * 0.6 - h);
  ctx.closePath();
  ctx.fill();

  if (params.damage01 > 0.01) {
    const scorch = Math.min(1, params.damage01);
    ctx.fillStyle = hexToRgba(ruinOverlay, 0.25 + scorch * 0.45);
    ctx.beginPath();
    ctx.moveTo(-sx * 0.2, -h * 0.2);
    ctx.lineTo(-sx * 0.7, sy * 0.4 - h * 0.3);
    ctx.lineTo(-sx * 0.6, sy * 0.6);
    ctx.lineTo(-sx * 0.1, sy * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hexToRgba('#000000', 0.15 + scorch * 0.25);
    ctx.beginPath();
    ctx.moveTo(sx * 0.1, -h * 0.5);
    ctx.lineTo(sx * 0.6, sy * 0.3 - h * 0.4);
    ctx.lineTo(sx * 0.5, sy * 0.5);
    ctx.lineTo(sx * 0.15, sy * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export function drawMothershipTeslaTower(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  params: TeslaTowerDraw,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (params.tx - params.ty) * halfW;
  const iy = (params.tx + params.ty) * halfH;
  const x = originX + ix;
  const y = originY + iy;

  const baseRadiusX = halfW * params.width * 0.55;
  const baseRadiusY = halfH * params.depth * 0.55;
  const columnHeight = params.height * 1.08;
  const damage = Math.max(0, Math.min(1, params.damage01));
  const integrity = 1 - damage;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const anim = now / 280 + params.tx * 1.37 + params.ty * 0.79;
  const flicker = 0.6 + 0.4 * Math.sin(anim);
  const pulse = Math.sin(anim * 2.1);

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
  ctx.beginPath();
  ctx.ellipse(0, baseRadiusY * 1.6, baseRadiusX * 1.28, baseRadiusY * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();

  const baseColor = adjustShade('#120920', -damage * 26);
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.ellipse(0, baseRadiusY * 1.05, baseRadiusX * 1.12, baseRadiusY * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexToRgba('#68f7ff', 0.28 + integrity * 0.35);
  ctx.lineWidth = 2;
  ctx.setLineDash([halfW * 0.24, halfW * 0.22]);
  ctx.beginPath();
  ctx.ellipse(0, baseRadiusY * 0.92, baseRadiusX * 0.92, baseRadiusY * 0.58, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const columnColor = adjustShade('#1a0c31', -damage * 38);
  ctx.fillStyle = columnColor;
  ctx.beginPath();
  ctx.moveTo(-baseRadiusX * 0.42, baseRadiusY * 0.45);
  ctx.lineTo(-baseRadiusX * 0.26, -columnHeight * 0.18);
  ctx.lineTo(-baseRadiusX * 0.12, -columnHeight);
  ctx.lineTo(baseRadiusX * 0.12, -columnHeight);
  ctx.lineTo(baseRadiusX * 0.26, -columnHeight * 0.18);
  ctx.lineTo(baseRadiusX * 0.42, baseRadiusY * 0.45);
  ctx.closePath();
  ctx.fill();

  const coreGradient = ctx.createLinearGradient(0, -columnHeight * 0.96, 0, baseRadiusY * 0.5);
  coreGradient.addColorStop(0, `rgba(166, 255, 255, ${0.18 + integrity * 0.4})`);
  coreGradient.addColorStop(0.4, `rgba(104, 229, 255, ${0.4 + 0.35 * flicker})`);
  coreGradient.addColorStop(0.8, adjustShade('#24113f', -damage * 18));
  coreGradient.addColorStop(1, adjustShade('#160922', -damage * 28));
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.moveTo(-baseRadiusX * 0.26, baseRadiusY * 0.3);
  ctx.lineTo(-baseRadiusX * 0.16, -columnHeight * 0.05);
  ctx.lineTo(-baseRadiusX * 0.08, -columnHeight * 0.82);
  ctx.lineTo(baseRadiusX * 0.08, -columnHeight * 0.82);
  ctx.lineTo(baseRadiusX * 0.16, -columnHeight * 0.05);
  ctx.lineTo(baseRadiusX * 0.26, baseRadiusY * 0.3);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = hexToRgba('#9dfcff', 0.16 + integrity * 0.32);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-baseRadiusX * 0.09, -columnHeight * 0.82);
  ctx.lineTo(-baseRadiusX * 0.2, baseRadiusY * 0.32);
  ctx.moveTo(baseRadiusX * 0.09, -columnHeight * 0.82);
  ctx.lineTo(baseRadiusX * 0.2, baseRadiusY * 0.32);
  ctx.stroke();

  const coilY = -columnHeight * 0.92;
  const coilRadius = baseRadiusX * 0.58;
  ctx.fillStyle = adjustShade('#1c0f30', -damage * 18);
  ctx.beginPath();
  ctx.ellipse(0, coilY + coilRadius * 0.48, coilRadius * 1.2, coilRadius * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  const coilGradient = ctx.createLinearGradient(
    0,
    coilY - coilRadius * 0.8,
    0,
    coilY + coilRadius * 0.6,
  );
  coilGradient.addColorStop(0, `rgba(198, 255, 255, ${0.24 + 0.32 * integrity})`);
  coilGradient.addColorStop(0.5, `rgba(120, 236, 255, ${0.46 + 0.34 * flicker})`);
  coilGradient.addColorStop(1, adjustShade('#221239', -damage * 26));
  ctx.fillStyle = coilGradient;
  ctx.beginPath();
  ctx.ellipse(0, coilY, coilRadius, coilRadius * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  const orbGlow = 0.32 + integrity * 0.5 + flicker * 0.18;
  ctx.shadowColor = `rgba(136, 228, 255, ${0.35 + integrity * 0.45})`;
  ctx.shadowBlur = 18 * (0.6 + 0.4 * integrity);
  ctx.fillStyle = `rgba(210, 255, 255, ${Math.min(0.9, orbGlow)})`;
  ctx.beginPath();
  ctx.arc(0, coilY - coilRadius * 0.62, coilRadius * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = `rgba(198, 255, 255, ${0.32 + orbGlow * 0.35})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(
    0,
    coilY - coilRadius * 0.72,
    coilRadius * (0.78 + 0.08 * pulse),
    coilRadius * (0.32 + 0.05 * Math.cos(anim * 1.8)),
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  const boltBaseY = coilY - coilRadius * 0.62;
  const boltTargets = [
    { x: -baseRadiusX * 0.82, y: baseRadiusY * 0.18, phase: 0.2 },
    { x: baseRadiusX * 0.82, y: baseRadiusY * 0.18, phase: 1.8 },
    { x: 0, y: -columnHeight * 0.34, phase: -1.2 },
  ];

  const outerBolt = `rgba(130, 228, 255, ${0.36 + 0.32 * orbGlow})`;
  const innerBolt = `rgba(255, 255, 255, ${0.32 + 0.28 * orbGlow})`;
  ctx.lineCap = 'round';
  for (let i = 0; i < boltTargets.length; i += 1) {
    const target = boltTargets[i]!;
    const sway = Math.sin(anim * 1.6 + target.phase) * coilRadius * 0.45;
    ctx.strokeStyle = outerBolt;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, boltBaseY);
    ctx.quadraticCurveTo(sway, coilY - coilRadius * 0.18, target.x, target.y);
    ctx.stroke();

    ctx.strokeStyle = innerBolt;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, boltBaseY);
    ctx.quadraticCurveTo(sway * 0.6, coilY - coilRadius * 0.05, target.x * 0.94, target.y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  if (damage > 0.04) {
    const scorch = 0.22 + damage * 0.55;
    ctx.fillStyle = hexToRgba('#07040c', scorch);
    ctx.beginPath();
    ctx.moveTo(-baseRadiusX * 0.34, baseRadiusY * 0.42);
    ctx.lineTo(-baseRadiusX * 0.18, 0);
    ctx.lineTo(-baseRadiusX * 0.05, baseRadiusY * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(baseRadiusX * 0.34, baseRadiusY * 0.42);
    ctx.lineTo(baseRadiusX * 0.18, 0);
    ctx.lineTo(baseRadiusX * 0.05, baseRadiusY * 0.52);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export function drawSynapseCluster(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  params: SynapseClusterDraw,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (params.tx - params.ty) * halfW;
  const iy = (params.tx + params.ty) * halfH;
  const x = originX + ix;
  const y = originY + iy;

  const baseRadiusX = halfW * params.width * 0.62;
  const baseRadiusY = halfH * params.depth * 0.62;
  const columnHeight = params.height * 1.08;
  const damage = Math.max(0, Math.min(1, params.damage01));
  const integrity = 1 - damage;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const pulse = 0.6 + 0.4 * Math.sin(now / 360 + params.tx * 0.77 + params.ty * 0.63);
  const tendrilPulse = 0.4 + 0.6 * Math.sin(now / 540 + params.tx * 0.91 + params.ty * 0.41);

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.beginPath();
  ctx.ellipse(0, baseRadiusY * 1.45, baseRadiusX * 1.18, baseRadiusY * 0.96, 0, 0, Math.PI * 2);
  ctx.fill();

  const fleshShadow = adjustShade('#1c0528', -damage * 32);
  const fleshMid = adjustShade('#2d0f3d', -damage * 22);
  const fleshHighlight = adjustShade('#3b1653', -damage * 14);

  const podOffsets = [-baseRadiusX * 0.65, 0, baseRadiusX * 0.65];
  for (let i = 0; i < podOffsets.length; i += 1) {
    ctx.save();
    ctx.translate(podOffsets[i]!, baseRadiusY * 0.08);
    ctx.scale(1, 0.82);
    const podGradient = ctx.createRadialGradient(
      0,
      -baseRadiusY * 0.2,
      baseRadiusX * 0.12,
      0,
      0,
      baseRadiusX * 0.7,
    );
    podGradient.addColorStop(0, adjustShade('#884fff', -damage * 28));
    podGradient.addColorStop(0.45, fleshHighlight);
    podGradient.addColorStop(1, fleshShadow);
    ctx.fillStyle = podGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, baseRadiusX * 0.58, baseRadiusY * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const bodyGradient = ctx.createRadialGradient(
    0,
    -columnHeight * 0.2,
    baseRadiusX * 0.2,
    0,
    -columnHeight * 0.2,
    baseRadiusX * 0.95,
  );
  bodyGradient.addColorStop(0, adjustShade('#7021ff', -damage * 24));
  bodyGradient.addColorStop(0.5, fleshMid);
  bodyGradient.addColorStop(1, fleshShadow);
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.moveTo(-baseRadiusX * 0.92, baseRadiusY * 0.28);
  ctx.bezierCurveTo(
    -baseRadiusX * 0.7,
    -baseRadiusY * 0.62,
    -baseRadiusX * 0.28,
    -columnHeight * 0.32,
    0,
    -columnHeight * 0.2,
  );
  ctx.bezierCurveTo(
    baseRadiusX * 0.28,
    -columnHeight * 0.32,
    baseRadiusX * 0.72,
    -baseRadiusY * 0.62,
    baseRadiusX * 0.92,
    baseRadiusY * 0.24,
  );
  ctx.quadraticCurveTo(0, baseRadiusY * 1.12, -baseRadiusX * 0.92, baseRadiusY * 0.28);
  ctx.closePath();
  ctx.fill();

  const veinColor = hexToRgba('#9dfff4', 0.18 + integrity * 0.36 * pulse);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = veinColor;
  ctx.beginPath();
  ctx.moveTo(-baseRadiusX * 0.52, baseRadiusY * 0.22);
  ctx.quadraticCurveTo(-baseRadiusX * 0.32, -columnHeight * 0.12, 0, -columnHeight * 0.64);
  ctx.quadraticCurveTo(
    baseRadiusX * 0.32,
    -columnHeight * 0.12,
    baseRadiusX * 0.52,
    baseRadiusY * 0.18,
  );
  ctx.stroke();

  ctx.lineWidth = 1.6;
  ctx.strokeStyle = hexToRgba('#68f7ff', 0.12 + integrity * 0.28 * tendrilPulse);
  ctx.beginPath();
  ctx.moveTo(-baseRadiusX * 0.72, baseRadiusY * 0.46);
  ctx.bezierCurveTo(
    -baseRadiusX * 0.55,
    baseRadiusY * 0.05,
    -baseRadiusX * 0.4,
    -columnHeight * 0.3,
    -baseRadiusX * 0.12,
    -columnHeight * 0.78,
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(baseRadiusX * 0.72, baseRadiusY * 0.44);
  ctx.bezierCurveTo(
    baseRadiusX * 0.55,
    baseRadiusY * 0.04,
    baseRadiusX * 0.4,
    -columnHeight * 0.3,
    baseRadiusX * 0.12,
    -columnHeight * 0.78,
  );
  ctx.stroke();

  const orbRadius = baseRadiusX * 0.34;
  const orbGlow = ctx.createRadialGradient(
    0,
    -columnHeight,
    orbRadius * 0.2,
    0,
    -columnHeight,
    orbRadius * 1.5,
  );
  orbGlow.addColorStop(0, hexToRgba('#d1ffff', 0.35 + integrity * 0.35));
  orbGlow.addColorStop(0.45, hexToRgba('#96f9ff', 0.42 + integrity * 0.4));
  orbGlow.addColorStop(1, hexToRgba('#311047', 0));
  ctx.fillStyle = orbGlow;
  ctx.beginPath();
  ctx.arc(0, -columnHeight, orbRadius * 1.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hexToRgba('#c9ffff', 0.45 + integrity * 0.35);
  ctx.beginPath();
  ctx.arc(0, -columnHeight, orbRadius * 0.7, 0, Math.PI * 2);
  ctx.fill();

  if (damage > 0.05) {
    const scorch = hexToRgba('#07030b', 0.18 + damage * 0.4);
    ctx.fillStyle = scorch;
    ctx.beginPath();
    ctx.moveTo(-baseRadiusX * 0.46, baseRadiusY * 0.52);
    ctx.lineTo(-baseRadiusX * 0.22, baseRadiusY * 0.35);
    ctx.lineTo(-baseRadiusX * 0.08, baseRadiusY * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(baseRadiusX * 0.46, baseRadiusY * 0.5);
    ctx.lineTo(baseRadiusX * 0.24, baseRadiusY * 0.34);
    ctx.lineTo(baseRadiusX * 0.1, baseRadiusY * 0.68);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = hexToRgba('#120718', 0.12 + damage * 0.35);
    ctx.beginPath();
    ctx.moveTo(-baseRadiusX * 0.18, -columnHeight * 0.1);
    ctx.lineTo(-baseRadiusX * 0.08, -columnHeight * 0.32);
    ctx.lineTo(-baseRadiusX * 0.02, baseRadiusY * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(baseRadiusX * 0.18, -columnHeight * 0.12);
    ctx.lineTo(baseRadiusX * 0.1, -columnHeight * 0.34);
    ctx.lineTo(baseRadiusX * 0.04, baseRadiusY * 0.18);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export function drawShieldPylons(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  params: ShieldPylonDraw,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (params.tx - params.ty) * halfW;
  const iy = (params.tx + params.ty) * halfH;
  const x = originX + ix;
  const y = originY + iy;

  const baseRadiusX = halfW * params.width * 0.68;
  const baseRadiusY = halfH * params.depth * 0.68;
  const pylonHeight = params.height * 1.12;
  const damage = Math.max(0, Math.min(1, params.damage01));
  const integrity = 1 - damage;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const pulse = 0.5 + 0.5 * Math.sin(now / 420 + params.tx * 0.84 + params.ty * 0.52);

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, baseRadiusY * 1.36, baseRadiusX * 1.12, baseRadiusY * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();

  const ringGradient = ctx.createRadialGradient(
    0,
    baseRadiusY * 0.25,
    baseRadiusX * 0.1,
    0,
    baseRadiusY * 0.25,
    baseRadiusX * 1.05,
  );
  ringGradient.addColorStop(0, hexToRgba('#62f1ff', 0.18 + integrity * 0.22 * pulse));
  ringGradient.addColorStop(0.45, adjustShade('#140d29', -damage * 18));
  ringGradient.addColorStop(1, adjustShade('#0c0616', -damage * 26));
  ctx.fillStyle = ringGradient;
  ctx.beginPath();
  ctx.ellipse(0, baseRadiusY * 0.42, baseRadiusX, baseRadiusY * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexToRgba('#7afcff', 0.16 + integrity * 0.32 * pulse);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, baseRadiusY * 0.42, baseRadiusX * 0.86, baseRadiusY * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();

  const pylonAngles = [Math.PI / 6, (Math.PI * 5) / 6, (-Math.PI * 3) / 6];
  const pylonColor = adjustShade('#201337', -damage * 24);
  const pylonHighlight = adjustShade('#32214f', -damage * 16);

  const pylonPositions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < pylonAngles.length; i += 1) {
    const angle = pylonAngles[i]!;
    const px = Math.cos(angle) * baseRadiusX * 0.72;
    const py = Math.sin(angle) * baseRadiusY * 0.72;
    pylonPositions.push({ x: px, y: py });

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, 0.88);
    ctx.fillStyle = pylonColor;
    ctx.beginPath();
    ctx.moveTo(-baseRadiusX * 0.18, baseRadiusY * 0.36);
    ctx.lineTo(-baseRadiusX * 0.08, -pylonHeight * 0.12);
    ctx.lineTo(-baseRadiusX * 0.04, -pylonHeight * 0.82);
    ctx.lineTo(baseRadiusX * 0.04, -pylonHeight * 0.82);
    ctx.lineTo(baseRadiusX * 0.08, -pylonHeight * 0.12);
    ctx.lineTo(baseRadiusX * 0.18, baseRadiusY * 0.36);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = pylonHighlight;
    ctx.beginPath();
    ctx.moveTo(-baseRadiusX * 0.06, baseRadiusY * 0.3);
    ctx.lineTo(-baseRadiusX * 0.02, -pylonHeight * 0.15);
    ctx.lineTo(-baseRadiusX * 0.01, -pylonHeight * 0.76);
    ctx.lineTo(baseRadiusX * 0.01, -pylonHeight * 0.76);
    ctx.lineTo(baseRadiusX * 0.02, -pylonHeight * 0.15);
    ctx.lineTo(baseRadiusX * 0.06, baseRadiusY * 0.3);
    ctx.closePath();
    ctx.fill();

    const capRadius = baseRadiusX * 0.16;
    const capGlow = ctx.createRadialGradient(
      0,
      -pylonHeight * 0.86,
      capRadius * 0.2,
      0,
      -pylonHeight * 0.86,
      capRadius * 1.4,
    );
    capGlow.addColorStop(0, hexToRgba('#deffff', 0.4 + integrity * 0.32));
    capGlow.addColorStop(0.6, hexToRgba('#70f8ff', 0.45 + integrity * 0.36));
    capGlow.addColorStop(1, hexToRgba('#2a1d45', 0));
    ctx.fillStyle = capGlow;
    ctx.beginPath();
    ctx.arc(0, -pylonHeight * 0.86, capRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  const arcAlpha = 0.24 + integrity * 0.38 * pulse;
  ctx.strokeStyle = hexToRgba('#7ef7ff', arcAlpha);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i < pylonPositions.length; i += 1) {
    const current = pylonPositions[i]!;
    const next = pylonPositions[(i + 1) % pylonPositions.length]!;
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2 - baseRadiusY * (0.4 + 0.12 * pulse);
    if (i === 0) {
      ctx.moveTo(current.x, current.y - baseRadiusY * 0.2);
    }
    ctx.quadraticCurveTo(midX, midY, next.x, next.y - baseRadiusY * 0.2);
  }
  ctx.closePath();
  ctx.stroke();

  if (damage > 0.05) {
    const scorch = hexToRgba('#05030a', 0.2 + damage * 0.35);
    ctx.fillStyle = scorch;
    ctx.beginPath();
    ctx.ellipse(0, baseRadiusY * 0.46, baseRadiusX * 0.7, baseRadiusY * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hexToRgba('#120a1f', 0.16 + damage * 0.3);
    for (let i = 0; i < pylonPositions.length; i += 1) {
      const pos = pylonPositions[i]!;
      ctx.beginPath();
      ctx.moveTo(pos.x - baseRadiusX * 0.08, pos.y + baseRadiusY * 0.2);
      ctx.lineTo(pos.x - baseRadiusX * 0.02, pos.y - baseRadiusY * 0.05);
      ctx.lineTo(pos.x + baseRadiusX * 0.02, pos.y - baseRadiusY * 0.05);
      ctx.lineTo(pos.x + baseRadiusX * 0.08, pos.y + baseRadiusY * 0.2);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function adjustShade(color: string, delta: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const clamp = (v: number): number => Math.max(0, Math.min(255, v));
  const r = clamp(rgb.r + delta);
  const g = clamp(rgb.g + delta);
  const b = clamp(rgb.b + delta);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
