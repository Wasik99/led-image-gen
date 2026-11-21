import { zipSync } from 'fflate';
import { BufferAttribute, BufferGeometry, Mesh } from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import type { Tile } from './geometry';

export function exportTiles(tiles: Tile[]): Uint8Array<ArrayBuffer> {
  const exporter = new STLExporter();
  const files: Record<string, Uint8Array> = {};

  for (const tile of tiles) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(tile.vertices, 3));
    const stl = exporter.parse(new Mesh(geometry), { binary: true });
    const row = String(tile.row + 1).padStart(2, '0');
    const column = String(tile.column + 1).padStart(2, '0');
    files[`kafelek-R${row}-K${column}.stl`] = new Uint8Array(stl.buffer);
    geometry.dispose();
  }

  return zipSync(files, { level: 3 });
}
