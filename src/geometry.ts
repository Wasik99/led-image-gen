import { MAX_DIMENSION, MIN_TILE_SIZE } from './layout';
import { defaultRandomSettings, defaultWaveSettings, patterns, type PatternId, type PatternSettings } from './patterns';

export const BASE_HEIGHT = 5;

export interface Tile {
  row: number;
  column: number;
  vertices: Float32Array;
  outline: Float32Array;
}

type MeshData = Pick<Tile, 'vertices' | 'outline'>;

function buildTileMesh(heights: number[][], side: number): MeshData {
  const vertices: number[] = [];
  const outline: number[] = [];
  const cells = heights.length;

  function cornerLevels(x: number, y: number, low: number, high: number) {
    const adjacent = [heights[y - 1]?.[x - 1], heights[y - 1]?.[x], heights[y]?.[x - 1], heights[y]?.[x]];
    const levels = adjacent.filter((z): z is number => z !== undefined && low < z && z < high);
    return [...new Set(levels)].sort((a, b) => a - b).concat(high);
  }

  function wall(ax: number, ay: number, bx: number, by: number, low: number, high: number) {
    if (low >= high) return;

    // Subdivide each wall edge at the heights of the cells meeting at its corner.
    const levelsA = cornerLevels(ax, ay, low, high);
    const levelsB = cornerLevels(bx, by, low, high);
    const leftX = ax * side / cells;
    const leftY = ay * side / cells;
    const rightX = bx * side / cells;
    const rightY = by * side / cells;
    let heightA = low;
    let heightB = low;
    let nextA = 0;
    let nextB = 0;

    while (nextA < levelsA.length || nextB < levelsB.length) {
      vertices.push(leftX, leftY, heightA, rightX, rightY, heightB);
      if ((levelsA[nextA] ?? Infinity) <= (levelsB[nextB] ?? Infinity)) {
        heightA = levelsA[nextA++];
        vertices.push(leftX, leftY, heightA);
      } else {
        heightB = levelsB[nextB++];
        vertices.push(rightX, rightY, heightB);
      }
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
      wall(x, y, x + 1, y, heights[y - 1]?.[x] ?? 0, z);
      wall(x + 1, y, x + 1, y + 1, heights[y][x + 1] ?? 0, z);
      wall(x + 1, y + 1, x, y + 1, heights[y + 1]?.[x] ?? 0, z);
      wall(x, y + 1, x, y, heights[y][x - 1] ?? 0, z);

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
  pattern: PatternId = 'smooth',
  settings: PatternSettings = { wave: defaultWaveSettings, random: defaultRandomSettings },
): Tile[] {
  if (!Number.isInteger(side) || side < MIN_TILE_SIZE ||
      [width, height].some((size) => size < side || size > MAX_DIMENSION || size % side !== 0)) {
    throw new Error('Wymiary obrazu muszą dzielić się przez bok kafelka.');
  }

  const { cellsPerTile, createElevation } = patterns[pattern];
  const columns = width / side;
  const rows = height / side;
  const elevation = createElevation(columns * cellsPerTile, rows * cellsPerTile, settings);
  const heights = Array.from({ length: rows * cellsPerTile }, (_, y) =>
    Array.from({ length: columns * cellsPerTile }, (_, x) => Math.fround(BASE_HEIGHT + elevation(x, y))),
  );
  const flatMesh = cellsPerTile === 1 ? buildTileMesh([[BASE_HEIGHT]], side) : undefined;
  const tiles: Tile[] = [];

  for (let row = 0; row < rows; row++) {
    const startY = (rows - 1 - row) * cellsPerTile;
    const tileRows = heights.slice(startY, startY + cellsPerTile);
    for (let column = 0; column < columns; column++) {
      const startX = column * cellsPerTile;
      const mesh = flatMesh ?? buildTileMesh(
        tileRows.map((line) => line.slice(startX, startX + cellsPerTile)), side,
      );
      tiles.push({ row, column, ...mesh });
    }
  }
  return tiles;
}
