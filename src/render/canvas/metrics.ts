export interface CanvasViewMetrics {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
}

export function getCanvasViewMetrics(ctx: CanvasRenderingContext2D): CanvasViewMetrics {
  const transform = ctx.getTransform();
  const scaleX = Math.hypot(transform.a, transform.b) || 1;
  const scaleY = Math.hypot(transform.c, transform.d) || 1;
  return {
    width: ctx.canvas.width / scaleX,
    height: ctx.canvas.height / scaleY,
    scaleX,
    scaleY,
  };
}
