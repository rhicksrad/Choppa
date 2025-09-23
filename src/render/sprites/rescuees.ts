export interface RescueRunnerDrawParams {
  x: number;
  y: number;
  angle: number;
  stepPhase: number;
  bob: number;
  fade: number;
  scale: number;
  drawShadow?: boolean;
}

export function drawRescueRunner(
  ctx: CanvasRenderingContext2D,
  params: RescueRunnerDrawParams,
): void {
  const bodyHeight = 12 * params.scale;
  const bodyWidth = 4.4 * params.scale;
  const headRadius = 2.4 * params.scale;

  ctx.save();
  ctx.translate(params.x, params.y - bodyHeight * 0.6 - params.bob);
  ctx.globalAlpha = Math.max(0, Math.min(1, params.fade));

  // Drop shadow
  if (params.drawShadow !== false) {
    ctx.save();
    ctx.translate(0, bodyHeight * 0.95);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyWidth * 0.9, bodyWidth * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Rotate 90° counter-clockwise so runners face the safe house correctly.
  ctx.rotate(params.angle - Math.PI);

  // Legs
  const legOffset = Math.sin(params.stepPhase) * bodyWidth * 0.55;
  const legLength = bodyHeight * 0.75;
  ctx.fillStyle = '#1f2d36';
  ctx.beginPath();
  ctx.roundRect(-bodyWidth * 0.35 - legOffset, 0, bodyWidth * 0.32, legLength, bodyWidth * 0.18);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(bodyWidth * 0.05 + legOffset, 0, bodyWidth * 0.32, legLength, bodyWidth * 0.18);
  ctx.fill();

  // Torso
  ctx.fillStyle = '#325a70';
  ctx.beginPath();
  ctx.roundRect(
    -bodyWidth * 0.55,
    -bodyHeight * 0.4,
    bodyWidth * 1.1,
    bodyHeight * 0.8,
    bodyWidth * 0.45,
  );
  ctx.fill();

  // Arms
  const armSwing = Math.sin(params.stepPhase + Math.PI / 2) * bodyWidth * 0.6;
  ctx.fillStyle = '#264655';
  ctx.beginPath();
  ctx.roundRect(
    -bodyWidth * 0.75 + armSwing,
    -bodyHeight * 0.32,
    bodyWidth * 0.35,
    bodyHeight * 0.7,
    bodyWidth * 0.18,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(
    bodyWidth * 0.4 - armSwing,
    -bodyHeight * 0.32,
    bodyWidth * 0.35,
    bodyHeight * 0.7,
    bodyWidth * 0.18,
  );
  ctx.fill();

  // Head
  ctx.fillStyle = '#f2d3b0';
  ctx.beginPath();
  ctx.arc(0, -bodyHeight * 0.65, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // Simple visor detail
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.beginPath();
  ctx.arc(headRadius * 0.3, -bodyHeight * 0.68, headRadius * 0.7, Math.PI * 0.1, Math.PI * 0.9);
  ctx.fill();

  ctx.restore();
}
