import { MAX_DIMENSION, MIN_TILE_SIZE } from './layout';

export const BASE_HEIGHT = 5;

export interface Tile {
  row: number;
  column: number;
  vertices: Float32Array;
}

type Point = [number, number, number];

function buildTileVertices(side: number): Float32Array {
  const a: Point = [0, 0, 0];
  const b: Point = [side, 0, 0];
  const c: Point = [side, side, 0];
  const d: Point = [0, side, 0];
  const e: Point = [0, 0, BASE_HEIGHT];
  const f: Point = [side, 0, BASE_HEIGHT];
  const g: Point = [side, side, BASE_HEIGHT];
  const h: Point = [0, side, BASE_HEIGHT];
  // Each face is wound counterclockwise when viewed from outside.
  const faces = [
    [a, d, c, b],
    [e, f, g, h],
    [a, b, f, e],
    [b, c, g, f],
    [c, d, h, g],
    [d, a, e, h],
  ];

  return new Float32Array(faces.flatMap(([first, second, third, fourth]) => [
    ...first, ...second, ...third, ...first, ...third, ...fourth,
  ]));
}

export function generateTiles(width: number, height: number, side: number): Tile[] {
  if (!Number.isInteger(side) || side < MIN_TILE_SIZE ||
      [width, height].some((size) => size < side || size > MAX_DIMENSION || size % side !== 0)) {
    throw new Error('Wymiary obrazu muszą dzielić się przez bok kafelka.');
  }

  const vertices = buildTileVertices(side);
  const tiles: Tile[] = [];
  for (let row = 0; row < height / side; row++) {
    for (let column = 0; column < width / side; column++) {
      tiles.push({ row, column, vertices });
    }
  }
  return tiles;
}
