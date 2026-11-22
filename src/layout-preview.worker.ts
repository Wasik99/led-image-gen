import type { Tile } from './geometry';
import type { PatternSettings } from './patterns';

export interface PreviewRequest {
  revision: number;
  width: number;
  height: number;
  side: number;
  settings: PatternSettings;
}

export type PreviewResponse =
  | { request: PreviewRequest; tiles: Tile[] }
  | { request: PreviewRequest; error: string };

self.addEventListener('message', async ({ data: request }: MessageEvent<PreviewRequest>) => {
  const { width, height, side, settings } = request;
  try {
    // Register the listener before the geometry module initializes WebAssembly.
    const { generateTiles } = await import('./geometry');
    const tiles = generateTiles(width, height, side, 'customLayout', settings);
    const buffers = new Set<Transferable>();
    for (const tile of tiles) {
      buffers.add(tile.vertices.buffer);
      buffers.add(tile.outline.buffer);
      if (tile.normals) buffers.add(tile.normals.buffer);
    }
    self.postMessage({ request, tiles } satisfies PreviewResponse, { transfer: [...buffers] });
  } catch (error) {
    self.postMessage({
      request, error: error instanceof Error ? error.message : String(error),
    } satisfies PreviewResponse);
  }
});
