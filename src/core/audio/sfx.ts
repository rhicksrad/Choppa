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
  const destination: AudioNode = (bus as any)['sfx'] || (bus as any);
  const now = ctx.currentTime;

  const burst = ctx.createBufferSource();
  burst.buffer = createNoiseBurst(ctx, 0.12);
  const burstFilter = ctx.createBiquadFilter();
  burstFilter.type = 'highpass';
  burstFilter.frequency.value = 1400;
  burstFilter.Q.value = 0.7;
  const burstGain = ctx.createGain();
  burstGain.gain.value = 0.05;
  burst.connect(burstFilter);
  burstFilter.connect(burstGain);
  burstGain.connect(destination);
  burstGain.gain.setValueAtTime(0.07, now);
  burstGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  burstFilter.frequency.setValueAtTime(1400, now);
  burstFilter.frequency.exponentialRampToValueAtTime(2600, now + 0.08);

  const crackOsc = ctx.createOscillator();
  crackOsc.type = 'triangle';
  const crackGain = ctx.createGain();
  crackGain.gain.value = 0.03;
  crackOsc.frequency.setValueAtTime(880, now);
  crackOsc.frequency.exponentialRampToValueAtTime(420, now + 0.08);
  crackOsc.connect(crackGain);
  crackGain.connect(destination);
  crackGain.gain.setValueAtTime(0.035, now);
  crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

  burst.start(now);
  burst.stop(now + 0.14);
  crackOsc.start(now);
  crackOsc.stop(now + 0.12);
}

export function playRocket(bus: AudioBus): void {
  const ctx = bus.context;
  const destination: AudioNode = (bus as any)['sfx'] || (bus as any);
  const now = ctx.currentTime;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBurst(ctx, 0.5);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 380;
  noiseFilter.Q.value = 0.9;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.05;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(destination);
  noiseGain.gain.setValueAtTime(0.08, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  noiseFilter.frequency.setValueAtTime(360, now);
  noiseFilter.frequency.linearRampToValueAtTime(520, now + 0.15);
  noiseFilter.frequency.exponentialRampToValueAtTime(210, now + 0.45);

  const tone = ctx.createOscillator();
  tone.type = 'sawtooth';
  const toneGain = ctx.createGain();
  toneGain.gain.value = 0.04;
  tone.frequency.setValueAtTime(300, now);
  tone.frequency.exponentialRampToValueAtTime(140, now + 0.35);
  tone.connect(toneGain);
  toneGain.connect(destination);
  toneGain.gain.setValueAtTime(0.05, now);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 95;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.028;
  sub.connect(subGain);
  subGain.connect(destination);
  subGain.gain.setValueAtTime(0.032, now + 0.02);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

  noise.start(now);
  noise.stop(now + 0.5);
  tone.start(now);
  tone.stop(now + 0.45);
  sub.start(now);
  sub.stop(now + 0.5);
}

export function playHellfire(bus: AudioBus): void {
  const ctx = bus.context;
  const destination: AudioNode = (bus as any)['sfx'] || (bus as any);
  const now = ctx.currentTime;

  // Roar layer
  const roarOsc = ctx.createOscillator();
  roarOsc.type = 'sawtooth';
  const roarGain = ctx.createGain();
  roarGain.gain.value = 0.08; // from feature branch
  const roarFilter = ctx.createBiquadFilter();
  roarFilter.type = 'bandpass';
  roarFilter.frequency.value = 560;
  roarFilter.Q.value = 1.2;
  roarOsc.connect(roarGain);
  roarGain.connect(roarFilter);
  roarFilter.connect(destination);
  roarGain.gain.setValueAtTime(0.09, now);
  roarGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
  roarOsc.frequency.setValueAtTime(440, now);
  roarOsc.frequency.exponentialRampToValueAtTime(90, now + 0.58);

  // Noisy blast
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = createNoiseBurst(ctx, 0.6);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 280;
  noiseFilter.Q.value = 0.7;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.095;
  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(destination);
  noiseGain.gain.setValueAtTime(0.1, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
  noiseFilter.frequency.setValueAtTime(280, now);
  noiseFilter.frequency.linearRampToValueAtTime(680, now + 0.14);
  noiseFilter.frequency.exponentialRampToValueAtTime(190, now + 0.62);

  // Sub impact
  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.value = 58;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.04;
  subOsc.connect(subGain);
  subGain.connect(destination);
  subGain.gain.setValueAtTime(0.045, now + 0.02);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);

  // Wind/whip layer
  const windSrc = ctx.createBufferSource();
  windSrc.buffer = createNoiseBurst(ctx, 0.5);
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 820;
  windFilter.Q.value = 1.4;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.04;
  windSrc.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(destination);
  windGain.gain.setValueAtTime(0.05, now + 0.05);
  windGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  windFilter.frequency.setValueAtTime(780, now + 0.05);
  windFilter.frequency.linearRampToValueAtTime(1120, now + 0.2);
  windFilter.frequency.exponentialRampToValueAtTime(340, now + 0.55);

  roarOsc.start(now);
  roarOsc.stop(now + 0.7);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.7);
  subOsc.start(now);
  subOsc.stop(now + 0.7);
  windSrc.start(now + 0.02);
  windSrc.stop(now + 0.6);
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

export function playExplosion(bus: AudioBus, size = 1): void {
  const ctx = bus.context;
  const destination: AudioNode = (bus as any)['sfx'] || (bus as any);
  const now = ctx.currentTime;
  const scale = Math.max(0.35, Math.min(3, size * 1.6));

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBurst(ctx, 0.7);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 2200;
  noiseFilter.Q.value = 0.5;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.12 * scale;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(destination);
  noiseGain.gain.setValueAtTime(0.12 * scale, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
  noiseFilter.frequency.setValueAtTime(1800, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(260, now + 0.7);

  const thumpOsc = ctx.createOscillator();
  thumpOsc.type = 'sine';
  thumpOsc.frequency.value = 52;
  const thumpGain = ctx.createGain();
  thumpGain.gain.value = 0.06 * scale;
  thumpOsc.connect(thumpGain);
  thumpGain.connect(destination);
  thumpGain.gain.setValueAtTime(0.08 * scale, now + 0.02);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

  const debris = ctx.createBufferSource();
  debris.buffer = createNoiseBurst(ctx, 0.25);
  const debrisFilter = ctx.createBiquadFilter();
  debrisFilter.type = 'highpass';
  debrisFilter.frequency.value = 1800;
  debrisFilter.Q.value = 1.4;
  const debrisGain = ctx.createGain();
  debrisGain.gain.value = 0.05 * Math.sqrt(scale);
  debris.connect(debrisFilter);
  debrisFilter.connect(debrisGain);
  debrisGain.connect(destination);
  debrisGain.gain.setValueAtTime(0.05 * Math.sqrt(scale), now + 0.04);
  debrisGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

  noise.start(now);
  noise.stop(now + 0.75);
  thumpOsc.start(now);
  thumpOsc.stop(now + 0.95);
  debris.start(now + 0.02);
  debris.stop(now + 0.32);
}
