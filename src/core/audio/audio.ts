export interface AudioBusOptions {
  masterVolume?: number; // 0..1
  musicVolume?: number; // 0..1
  sfxVolume?: number; // 0..1
}

/**
 * Simple audio bus graph: master -> { music, sfx }.
 * Uses WebAudio. Decode buffers externally via AssetLoader.
 */
export class AudioBus {
  public readonly context: AudioContext;
  private readonly master: GainNode;
  private readonly music: GainNode;
  private readonly sfx: GainNode;

  constructor(options?: AudioBusOptions) {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = this.context;

    this.master = ctx.createGain();
    this.music = ctx.createGain();
    this.sfx = ctx.createGain();

    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(ctx.destination);

    this.setMaster(options?.masterVolume ?? 1);
    this.setMusic(options?.musicVolume ?? 1);
    this.setSfx(options?.sfxVolume ?? 1);
  }

  public setMaster(value: number): void {
    this.master.gain.value = clamp01(value);
  }
  public setMusic(value: number): void {
    this.music.gain.value = clamp01(value);
  }
  public setSfx(value: number): void {
    this.sfx.gain.value = clamp01(value);
  }

  public playMusic(buffer: AudioBuffer, loop = true): AudioBufferSourceNode {
    const node = this.context.createBufferSource();
    node.buffer = buffer;
    node.loop = loop;
    node.connect(this.music);
    node.start();
    return node;
  }

  public playSfx(buffer: AudioBuffer, options?: { playbackRate?: number }): void {
    const node = this.context.createBufferSource();
    node.buffer = buffer;
    if (options?.playbackRate) node.playbackRate.value = options.playbackRate;
    node.connect(this.sfx);
    node.start();
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
