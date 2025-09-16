import { AudioBus } from './audio';

export class EngineSound {
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private targetGain = 0;
  private started = false;

  constructor(private bus: AudioBus) {}

  public start(): void {
    if (this.started) return;
    this.started = true;
    const ctx = this.bus.context;
    this.osc = ctx.createOscillator();
    this.gain = ctx.createGain();
    this.osc.type = 'sawtooth';
    this.osc.frequency.value = 80;
    this.gain.gain.value = 0;
    this.osc.connect(this.gain);
    this.gain.connect((this.bus as any)['sfx'] || (this.bus as any));
    this.osc.start();
  }

  public setIntensity(intensity01: number): void {
    if (!this.osc || !this.gain) return;
    const clamped = Math.max(0, Math.min(1, intensity01));
    this.osc.frequency.value = 70 + clamped * 60;
    this.targetGain = 0.02 + clamped * 0.08;
    // Smoothly approach target
    const g = this.gain.gain;
    const now = this.bus.context.currentTime;
    g.cancelScheduledValues(now);
    g.linearRampToValueAtTime(this.targetGain, now + 0.1);
  }

  public stop(): void {
    if (!this.osc || !this.gain) return;
    try {
      this.osc.stop();
    } catch {}
    this.osc.disconnect();
    this.gain.disconnect();
    this.osc = null;
    this.gain = null;
  }
}

export function playCannon(bus: AudioBus): void {
  const ctx = bus.context;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 600;
  gain.gain.value = 0.06;
  const t = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.05);
  osc.connect(gain);
  gain.connect((bus as any)['sfx'] || (bus as any));
  osc.start();
  osc.stop(t + 0.08);
}

export function playRocket(bus: AudioBus): void {
  const ctx = bus.context;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 220;
  gain.gain.value = 0.04;
  const t = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.22);
  osc.connect(gain);
  gain.connect((bus as any)['sfx'] || (bus as any));
  osc.start();
  osc.stop(t + 0.28);
}

export function playMissile(bus: AudioBus): void {
  const ctx = bus.context;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 260;
  gain.gain.value = 0.05;
  const t = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.frequency.exponentialRampToValueAtTime(360, t + 0.2);
  osc.connect(gain);
  gain.connect((bus as any)['sfx'] || (bus as any));
  osc.start();
  osc.stop(t + 0.36);
}

export function playExplosion(bus: AudioBus): void {
  const ctx = bus.context;
  const buffer = ctx.createBuffer(1, 4410, 44100);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const n = Math.random() * 2 - 1;
    const env = 1 - i / data.length;
    data[i] = n * env * env;
  }
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = 0.12;
  src.buffer = buffer;
  src.connect(gain);
  gain.connect((bus as any)['sfx'] || (bus as any));
  src.start();
}

export function playPickup(bus: AudioBus): void {
  const ctx = bus.context;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 720;
  gain.gain.value = 0.05;
  const t = ctx.currentTime;
  osc.frequency.exponentialRampToValueAtTime(1280, t + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(gain);
  gain.connect((bus as any)['sfx'] || (bus as any));
  osc.start();
  osc.stop(t + 0.14);
}
