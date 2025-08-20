// Minimal subset of Tiled JSON for isometric, non-staggered maps
export interface TiledTilesetRef {
  firstgid: number;
  source?: string;
  name?: string;
  tilewidth: number;
  tileheight: number;
  image?: string;
  imagewidth?: number;
  imageheight?: number;
  tilecount?: number;
  columns?: number;
}

export interface TiledLayer {
  type: 'tilelayer' | 'objectgroup';
  name: string;
  visible: boolean;
  opacity: number;
  data?: number[]; // CSV array of gids
  width?: number;
  height?: number;
  objects?: Array<{
    id: number;
    name: string;
    type: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    rotation?: number;
    properties?: Array<{ name: string; type: string; value: unknown }>;
  }>;
}

export interface TiledMap {
  type: 'map';
  orientation: 'isometric';
  renderorder?: string;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  infinite?: boolean;
  layers: TiledLayer[];
  tilesets: TiledTilesetRef[];
}

export interface RuntimeTilemap {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  layers: { name: string; data: Uint32Array }[]; // gids
}

export function parseTiled(json: unknown): RuntimeTilemap {
  const map = json as TiledMap;
  if (map.type !== 'map' || map.orientation !== 'isometric') {
    throw new Error('Only isometric Tiled maps are supported');
  }
  if (map.infinite) throw new Error('Infinite maps are not supported');

  const layers = map.layers
    .filter((l) => l.type === 'tilelayer' && l.data && l.visible !== false)
    .map((l) => ({
      name: l.name,
      data: Uint32Array.from(l.data as number[]),
    }));

  return {
    width: map.width,
    height: map.height,
    tileWidth: map.tilewidth,
    tileHeight: map.tileheight,
    layers,
  };
}
