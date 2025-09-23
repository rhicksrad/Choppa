import { AudioBus } from './audio';

export type MusicTrackMap = Record<string, string>;

interface TrackState {
  url: string;
}

export class MusicController {
  private readonly tracks = new Map<string, TrackState>();
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly loading = new Map<string, Promise<AudioBuffer | null>>();

  private currentSource: AudioBufferSourceNode | null = null;
  private currentTrackId: string | null = null;

  public constructor(
    private readonly bus: AudioBus,
    tracks?: MusicTrackMap,
  ) {
    if (tracks) this.registerTracks(tracks);
  }

  public registerTracks(tracks: MusicTrackMap): void {
    for (const [id, url] of Object.entries(tracks)) {
      this.tracks.set(id, { url });
    }
  }

  public async preload(trackId: string): Promise<void> {
    await this.ensureBuffer(trackId);
  }

  public async preloadAll(): Promise<void> {
    await Promise.all(Array.from(this.tracks.keys()).map((id) => this.ensureBuffer(id)));
  }

  public async play(trackId: string): Promise<void> {
    if (!this.tracks.has(trackId)) {
      console.warn(`[music] Unknown track: ${trackId}`);
      return;
    }

    if (this.currentTrackId === trackId && this.currentSource) {
      return;
    }

    await this.resumeContext();
    const buffer = await this.ensureBuffer(trackId);
    if (!buffer) return;

    this.stopCurrent();
    const source = this.bus.playMusic(buffer, true);
    this.currentSource = source;
    this.currentTrackId = trackId;
  }

  public stop(): void {
    this.stopCurrent();
  }

  public getCurrentTrack(): string | null {
    return this.currentTrackId;
  }

  private stopCurrent(): void {
    if (!this.currentSource) return;
    try {
      this.currentSource.stop();
    } catch {
      // Ignore errors from stopping an already stopped source.
    }
    try {
      this.currentSource.disconnect();
    } catch {
      // Ignore disconnect errors if already disconnected.
    }
    this.currentSource = null;
    this.currentTrackId = null;
  }

  private async ensureBuffer(trackId: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(trackId);
    if (cached) return cached;

    let loading = this.loading.get(trackId);
    if (!loading) {
      const track = this.tracks.get(trackId);
      if (!track) return null;
      loading = this.fetchAndDecode(track.url).then((buffer) => {
        if (buffer) this.buffers.set(trackId, buffer);
        this.loading.delete(trackId);
        return buffer;
      });
      this.loading.set(trackId, loading);
    }

    return await loading;
  }

  private async fetchAndDecode(url: string): Promise<AudioBuffer | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return await new Promise<AudioBuffer>((resolve, reject) => {
        this.bus.context.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
      });
    } catch (err) {
      console.warn(`[music] Failed to load track ${url}:`, err);
      return null;
    }
  }

  private async resumeContext(): Promise<void> {
    if (this.bus.context.state === 'suspended') {
      try {
        await this.bus.context.resume();
      } catch (err) {
        console.warn('[music] Failed to resume audio context', err);
      }
    }
  }
}
