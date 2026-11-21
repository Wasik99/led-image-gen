export const TILE_SIZE = 100;
export const MAX_DIMENSION = 2000;
export const BASE_HEIGHT = 5;

export interface Tile {
  row: number;
  column: number;
  vertices: Float32Array;
}

type Point = [number, number, number];

function buildTileVertices(): Float32Array {
  const a: Point = [0, 0, 0];
  const b: Point = [TILE_SIZE, 0, 0];
  const c: Point = [TILE_SIZE, TILE_SIZE, 0];
  const d: Point = [0, TILE_SIZE, 0];
  const e: Point = [0, 0, BASE_HEIGHT];
  const f: Point = [TILE_SIZE, 0, BASE_HEIGHT];
  const g: Point = [TILE_SIZE, TILE_SIZE, BASE_HEIGHT];
  const h: Point = [0, TILE_SIZE, BASE_HEIGHT];
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

export function generateTiles(width: number, height: number): Tile[] {
  const dimensions = [width, height];
  if (dimensions.some((size) => size < TILE_SIZE || size > MAX_DIMENSION || size % TILE_SIZE !== 0)) {
    throw new Error(`Podaj wymiary od ${TILE_SIZE} do ${MAX_DIMENSION} mm, podzielne przez ${TILE_SIZE} mm.`);
  }

  const vertices = buildTileVertices();
  const tiles: Tile[] = [];
  for (let row = 0; row < height / TILE_SIZE; row++) {
    for (let column = 0; column < width / TILE_SIZE; column++) {
      tiles.push({ row, column, vertices });
    }
  }
  return tiles;
}
