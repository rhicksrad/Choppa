import type { InputSnapshot } from '../../core/input/input';

export interface MenuItem {
  id: string;
  label: string;
}

export class Menu {
  private items: MenuItem[];
  private index = 0;

  constructor(items: MenuItem[]) {
    this.items = items;
  }

  public update(input: InputSnapshot): string | null {
    // Keyboard navigation
    if (input.keys['ArrowUp'] || input.keys['w'] || input.keys['W']) this.index -= 1;
    if (input.keys['ArrowDown'] || input.keys['s'] || input.keys['S']) this.index += 1;
    if (this.index < 0) this.index = this.items.length - 1;
    if (this.index >= this.items.length) this.index = 0;

    // Activate
    if (input.keys['Enter'] || (input.mouseButtons & 1) !== 0) {
      return this.items[this.index]!.id;
    }

    // Mouse hover selection
    // Caller should provide geometry; here we only support click-to-activate on current selection
    return null;
  }

  public render(context: CanvasRenderingContext2D, title: string, subtitle: string): void {
    const w = context.canvas.width;
    const h = context.canvas.height;
    context.save();
    context.fillStyle = '#0e141a';
    context.globalAlpha = 0.75;
    context.fillRect(0, 0, w, h);
    context.globalAlpha = 1;

    context.fillStyle = '#92ffa6';
    context.font = 'bold 32px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(title, w / 2, h * 0.28);
    context.fillStyle = '#c8d7e1';
    context.font = '14px system-ui, sans-serif';
    context.fillText(subtitle, w / 2, h * 0.28 + 22);

    const startY = h * 0.45;
    for (let i = 0; i < this.items.length; i += 1) {
      const y = startY + i * 28;
      const item = this.items[i]!;
      const selected = i === this.index;
      context.fillStyle = selected ? '#ffffff' : '#9fb3c8';
      context.font = selected ? 'bold 18px system-ui, sans-serif' : '16px system-ui, sans-serif';
      context.fillText(item.label, w / 2, y);
    }

    context.restore();
  }
}
