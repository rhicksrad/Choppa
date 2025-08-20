export type AssetKind = 'image' | 'audio' | 'json';

export interface LoadTask<T> {
  key: string;
  kind: AssetKind;
  url: string;
  parser?: (input: unknown) => T;
}

export type AssetMap = Record<string, unknown>;

export type ProgressListener = (loaded: number, total: number, currentKey?: string) => void;

/**
 * Lightweight asset loader with progress callbacks.
 */
export class AssetLoader {
  private assets: AssetMap = Object.create(null);
  private progress?: ProgressListener;

  public onProgress(listener: ProgressListener): void {
    this.progress = listener;
  }

  public get<T>(key: string): T | undefined {
    return this.assets[key] as T | undefined;
  }

  public async loadAll(tasks: LoadTask<unknown>[]): Promise<void> {
    let loaded = 0;
    const total = tasks.length;
    const update = (key?: string): void => this.progress?.(loaded, total, key);

    for (let i = 0; i < tasks.length; i += 1) {
      const task = tasks[i];
      const asset = await this.loadOne(task);
      this.assets[task.key] = asset;
      loaded += 1;
      update(task.key);
    }
  }

  private async loadOne(task: LoadTask<unknown>): Promise<unknown> {
    switch (task.kind) {
      case 'image':
        return await this.loadImage(task.url);
      case 'audio':
        return await this.loadArrayBuffer(task.url);
      case 'json':
        return await this.loadJson(task.url);
      default:
        throw new Error(`Unknown asset kind: ${task.kind}`);
    }
  }

  private async loadJson(url: string): Promise<unknown> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load JSON: ${url}`);
    return (await res.json()) as unknown;
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  private async loadArrayBuffer(url: string): Promise<ArrayBuffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load audio: ${url}`);
    return await res.arrayBuffer();
  }
}
