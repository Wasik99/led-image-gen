import { MAX_DIMENSION, MIN_TILE_SIZE } from './layout';
import { defaultWaveSettings, patterns, type PatternId, type WaveSettings } from './patterns';

export const BASE_HEIGHT = 5;

export interface Tile {
  row: number;
  column: number;
  vertices: Float32Array;
  outline: Float32Array;
}

type MeshData = Pick<Tile, 'vertices' | 'outline'>;

function buildTileMesh(heights: number[][], levels: number[], side: number): MeshData {
  const vertices: number[] = [];
  const outline: number[] = [];
  const cells = heights.length;

  function wall(ax: number, ay: number, bx: number, by: number, low: number, high: number) {
    if (low >= high) return;
    let bottom = low;
    // Shared levels ensure triangles meet along full edges at stepped corners.
    for (const top of levels) {
      if (top <= bottom) continue;
      vertices.push(
        ax, ay, bottom, bx, by, bottom, bx, by, top,
        ax, ay, bottom, bx, by, top, ax, ay, top,
      );
      if (top === high) break;
      bottom = top;
    }
  }

  function rim(ax: number, ay: number, bx: number, by: number, z: number) {
    outline.push(ax, ay, z + 0.05, bx, by, z + 0.05);
  }

  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const left = x * side / cells;
      const right = (x + 1) * side / cells;
      const bottom = y * side / cells;
      const top = (y + 1) * side / cells;
      const z = heights[y][x];
      vertices.push(
        left, bottom, z, right, bottom, z, right, top, z,
        left, bottom, z, right, top, z, left, top, z,
        left, bottom, 0, left, top, 0, right, top, 0,
        left, bottom, 0, right, top, 0, right, bottom, 0,
      );
      wall(left, bottom, right, bottom, heights[y - 1]?.[x] ?? 0, z);
      wall(right, bottom, right, top, heights[y][x + 1] ?? 0, z);
      wall(right, top, left, top, heights[y + 1]?.[x] ?? 0, z);
      wall(left, top, left, bottom, heights[y][x - 1] ?? 0, z);

      if (y === 0) rim(left, bottom, right, bottom, z);
      if (x === cells - 1) rim(right, bottom, right, top, z);
      if (y === cells - 1) rim(right, top, left, top, z);
      if (x === 0) rim(left, top, left, bottom, z);
    }
  }

  return { vertices: new Float32Array(vertices), outline: new Float32Array(outline) };
}

export function generateTiles(
  width: number, height: number, side: number,
  pattern: PatternId = 'smooth', waveSettings: WaveSettings = defaultWaveSettings,
): Tile[] {
  if (!Number.isInteger(side) || side < MIN_TILE_SIZE ||
      [width, height].some((size) => size < side || size > MAX_DIMENSION || size % side !== 0)) {
    throw new Error('Wymiary obrazu muszą dzielić się przez bok kafelka.');
  }

  const { cellsPerTile, createElevation } = patterns[pattern];
  const columns = width / side;
  const rows = height / side;
  const elevation = createElevation(columns * cellsPerTile, rows * cellsPerTile, waveSettings);
  const heights = Array.from({ length: rows * cellsPerTile }, (_, y) =>
    Array.from({ length: columns * cellsPerTile }, (_, x) => BASE_HEIGHT + elevation(x, y)),
  );
  const levels = [...new Set(heights.flat())].sort((a, b) => a - b);
  const flatMesh = levels.length === 1 ? buildTileMesh([[levels[0]]], levels, side) : undefined;
  const tiles: Tile[] = [];

  for (let row = 0; row < rows; row++) {
    const startY = (rows - 1 - row) * cellsPerTile;
    const tileRows = heights.slice(startY, startY + cellsPerTile);
    for (let column = 0; column < columns; column++) {
      const startX = column * cellsPerTile;
      const mesh = flatMesh ?? buildTileMesh(
        tileRows.map((line) => line.slice(startX, startX + cellsPerTile)), levels, side,
      );
      tiles.push({ row, column, ...mesh });
    }
  }
  return tiles;
}
