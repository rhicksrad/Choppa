import { AudioBus } from './audio';

export class EngineSound {
  private static noiseBuffer: AudioBuffer | null = null;

  private started = false;
  private rotorOscA: OscillatorNode | null = null;
  private rotorOscB: OscillatorNode | null = null;
  private rotorGain: GainNode | null = null;
  private rotorFilter: BiquadFilterNode | null = null;
  private chopLfo: OscillatorNode | null = null;
  private chopDepth: GainNode | null = null;
  private turbineOsc: OscillatorNode | null = null;
  private turbineGain: GainNode | null = null;
  private washSource: AudioBufferSourceNode | null = null;
  private washFilter: BiquadFilterNode | null = null;
  private washGain: GainNode | null = null;

  constructor(private bus: AudioBus) {}

  public start(): void {
    if (this.started) return;
    this.started = true;
    const ctx = this.bus.context;
    const destination: AudioNode = (this.bus as any)['sfx'] || (this.bus as any);

    // Main rotor body – two slightly detuned saws with low-pass filtering.
    this.rotorOscA = ctx.createOscillator();
    this.rotorOscB = ctx.createOscillator();
    this.rotorGain = ctx.createGain();
    this.rotorFilter = ctx.createBiquadFilter();
    this.rotorOscA.type = 'sawtooth';
    this.rotorOscB.type = 'sawtooth';
    this.rotorOscA.frequency.value = 46;
    this.rotorOscB.frequency.value = 46;
    this.rotorOscB.detune.value = 8;
    this.rotorGain.gain.value = 0.02;
    this.rotorFilter.type = 'lowpass';
    this.rotorFilter.frequency.value = 520;
    this.rotorFilter.Q.value = 0.9;
    this.rotorOscA.connect(this.rotorGain);
    this.rotorOscB.connect(this.rotorGain);
    this.rotorGain.connect(this.rotorFilter);
    this.rotorFilter.connect(destination);

    // Blade chop modulation – low-frequency oscillator pushes the thump.
    this.chopLfo = ctx.createOscillator();
    this.chopDepth = ctx.createGain();
    this.chopLfo.type = 'sine';
    this.chopLfo.frequency.value = 3.6;
    this.chopDepth.gain.value = 0.02;
    this.chopLfo.connect(this.chopDepth);
    this.chopDepth.connect(this.rotorGain.gain);

    // Turbine whine gives the high-end air whirr.
    this.turbineOsc = ctx.createOscillator();
    this.turbineGain = ctx.createGain();
    this.turbineOsc.type = 'triangle';
    this.turbineOsc.frequency.value = 340;
    this.turbineGain.gain.value = 0.01;
    this.turbineOsc.connect(this.turbineGain);
    this.turbineGain.connect(destination);

    // Rotor wash – filtered noise underneath the mix.
    this.washSource = ctx.createBufferSource();
    this.washFilter = ctx.createBiquadFilter();
    this.washGain = ctx.createGain();
    this.washSource.buffer = EngineSound.getNoiseBuffer(ctx);
    this.washSource.loop = true;
    this.washFilter.type = 'bandpass';
    this.washFilter.frequency.value = 820;
    this.washFilter.Q.value = 0.7;
    this.washGain.gain.value = 0.014;
    this.washSource.connect(this.washFilter);
    this.washFilter.connect(this.washGain);
    this.washGain.connect(destination);

    this.rotorOscA.start();
    this.rotorOscB.start();
    this.chopLfo.start();
    this.turbineOsc.start();
    this.washSource.start();
  }

  public setIntensity(intensity01: number): void {
    if (!this.started) return;
    const clamped = Math.max(0, Math.min(1, intensity01));
    const ctx = this.bus.context;
    const now = ctx.currentTime;

    if (this.rotorOscA && this.rotorOscB) {
      const rotorFreq = 46 + clamped * 32;
      this.rotorOscA.frequency.cancelScheduledValues(now);
      this.rotorOscA.frequency.linearRampToValueAtTime(rotorFreq, now + 0.2);
      this.rotorOscB.frequency.cancelScheduledValues(now);
      this.rotorOscB.frequency.linearRampToValueAtTime(rotorFreq, now + 0.2);
      this.rotorOscB.detune.cancelScheduledValues(now);
      this.rotorOscB.detune.linearRampToValueAtTime(8 + clamped * 14, now + 0.2);
    }

    if (this.rotorGain) {
      const g = this.rotorGain.gain;
      g.cancelScheduledValues(now);
      g.linearRampToValueAtTime(0.02 + clamped * 0.13, now + 0.2);
    }

    if (this.chopLfo && this.chopDepth) {
      this.chopLfo.frequency.cancelScheduledValues(now);
      this.chopLfo.frequency.linearRampToValueAtTime(3.4 + clamped * 3.6, now + 0.2);
      const depth = this.chopDepth.gain;
      depth.cancelScheduledValues(now);
      depth.linearRampToValueAtTime(0.018 + clamped * 0.085, now + 0.2);
    }

    if (this.rotorFilter) {
      this.rotorFilter.frequency.cancelScheduledValues(now);
      this.rotorFilter.frequency.linearRampToValueAtTime(520 + clamped * 520, now + 0.3);
    }

    if (this.turbineOsc && this.turbineGain) {
      this.turbineOsc.frequency.cancelScheduledValues(now);
      this.turbineOsc.frequency.linearRampToValueAtTime(320 + clamped * 260, now + 0.25);
      const gain = this.turbineGain.gain;
      gain.cancelScheduledValues(now);
      gain.linearRampToValueAtTime(0.01 + clamped * 0.06, now + 0.2);
    }

    if (this.washGain && this.washFilter) {
      const washG = this.washGain.gain;
      washG.cancelScheduledValues(now);
      washG.linearRampToValueAtTime(0.014 + clamped * 0.09, now + 0.25);
      this.washFilter.frequency.cancelScheduledValues(now);
      this.washFilter.frequency.linearRampToValueAtTime(760 + clamped * 920, now + 0.25);
    }
  }

  public stop(): void {
    if (!this.started) return;
    this.started = false;
    const ctx = this.bus.context;
    const now = ctx.currentTime;
    const stopTime = now + 0.3;

    if (this.rotorGain) {
      const g = this.rotorGain.gain;
      g.cancelScheduledValues(now);
      g.linearRampToValueAtTime(0.0001, stopTime);
    }
    if (this.chopDepth) {
      const depth = this.chopDepth.gain;
      depth.cancelScheduledValues(now);
      depth.linearRampToValueAtTime(0, stopTime);
    }
    if (this.turbineGain) {
      const g = this.turbineGain.gain;
      g.cancelScheduledValues(now);
      g.linearRampToValueAtTime(0.0001, stopTime);
    }
    if (this.washGain) {
      const g = this.washGain.gain;
      g.cancelScheduledValues(now);
      g.linearRampToValueAtTime(0.0001, stopTime);
    }

    this.stopNode(this.chopLfo, stopTime);
    this.stopNode(this.rotorOscA, stopTime);
    this.stopNode(this.rotorOscB, stopTime);
    this.stopNode(this.turbineOsc, stopTime);
    this.stopNode(this.washSource, stopTime);

    this.disconnectNode(this.rotorOscA);
    this.disconnectNode(this.rotorOscB);
    this.disconnectNode(this.chopDepth);
    this.disconnectNode(this.rotorGain);
    this.disconnectNode(this.rotorFilter);
    this.disconnectNode(this.turbineGain);
    this.disconnectNode(this.washFilter);
    this.disconnectNode(this.washGain);
    this.disconnectNode(this.turbineOsc);
    this.disconnectNode(this.washSource);

    this.chopLfo = null;
    this.chopDepth = null;
    this.rotorOscA = null;
    this.rotorOscB = null;
    this.rotorGain = null;
    this.rotorFilter = null;
    this.turbineOsc = null;
    this.turbineGain = null;
    this.washSource = null;
    this.washFilter = null;
    this.washGain = null;
  }

  private stopNode(node: { stop: (when?: number) => void } | null, when: number): void {
    if (!node) return;
    try {
      node.stop(when);
    } catch {
      try {
        node.stop();
      } catch {}
    }
  }

  private disconnectNode(node: AudioNode | null): void {
    node?.disconnect();
  }

  private static getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!EngineSound.noiseBuffer) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      EngineSound.noiseBuffer = buffer;
    }
    return EngineSound.noiseBuffer;
  }
}

export function playMissile(bus: AudioBus): void {
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

export function playHellfire(bus: AudioBus): void {
  const ctx = bus.context;
  const destination: AudioNode = (bus as any)['sfx'] || (bus as any);
  const now = ctx.currentTime;

  const roarOsc = ctx.createOscillator();
  roarOsc.type = 'sawtooth';
  const roarGain = ctx.createGain();
  roarGain.gain.value = 0.06;
  const roarFilter = ctx.createBiquadFilter();
  roarFilter.type = 'bandpass';
  roarFilter.frequency.value = 520;
  roarFilter.Q.value = 1.1;
  roarOsc.connect(roarGain);
  roarGain.connect(roarFilter);
  roarFilter.connect(destination);
  roarGain.gain.setValueAtTime(0.07, now);
  roarGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  roarOsc.frequency.setValueAtTime(420, now);
  roarOsc.frequency.exponentialRampToValueAtTime(110, now + 0.5);

  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = createNoiseBurst(ctx, 0.5);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 260;
  noiseFilter.Q.value = 0.6;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.085;
  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(destination);
  noiseGain.gain.setValueAtTime(0.09, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  noiseFilter.frequency.setValueAtTime(260, now);
  noiseFilter.frequency.linearRampToValueAtTime(620, now + 0.12);
  noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.55);

  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.value = 62;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.035;
  subOsc.connect(subGain);
  subGain.connect(destination);
  subGain.gain.setValueAtTime(0.04, now);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

  roarOsc.start(now);
  roarOsc.stop(now + 0.6);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.6);
  subOsc.start(now);
  subOsc.stop(now + 0.6);
}

function createNoiseBurst(ctx: AudioContext, duration: number): AudioBuffer {
  const length = Math.max(1, Math.floor(duration * ctx.sampleRate));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const env = 1 - i / length;
    data[i] = (Math.random() * 2 - 1) * env * env;
  }
  return buffer;
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
