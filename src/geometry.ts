export const TILE_SIZE = 100;
export const MAX_DIMENSION = 2000;
const CELLS_PER_TILE = 5;
const CELL_SIZE = TILE_SIZE / CELLS_PER_TILE;
const BASE_HEIGHT = 5;
const RELIEF_STEP = 2;

const columnPattern = [0, 1, 3, 1, 0, 2, 1, 3, 2, 0];
const rowPattern = [1, 0, 2, 1, 3, 2, 0, 1, 0, 2];

export interface Tile {
  row: number;
  column: number;
  vertices: Float32Array;
}

type Point = [number, number, number];

function buildTile(row: number, column: number): Tile {
  const vertices: number[] = [];
  const elevations = Array.from({ length: CELLS_PER_TILE }, (_, y) =>
    Array.from({ length: CELLS_PER_TILE }, (_, x) => {
      const globalX = column * CELLS_PER_TILE + x;
      const globalY = row * CELLS_PER_TILE + CELLS_PER_TILE - 1 - y;
      const level = columnPattern[globalX % columnPattern.length] + rowPattern[globalY % rowPattern.length];
      return BASE_HEIGHT + level * RELIEF_STEP;
    }),
  );

  function quad(a: Point, b: Point, c: Point, d: Point) {
    vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
  }

  function wall(ax: number, ay: number, bx: number, by: number, low: number, high: number) {
    // Shared height bands keep vertical edges aligned at stepped corners.
    for (let bottom = low; bottom < high;) {
      const top = bottom === 0 ? BASE_HEIGHT : bottom + RELIEF_STEP;
      quad([ax, ay, bottom], [bx, by, bottom], [bx, by, top], [ax, ay, top]);
      bottom = top;
    }
  }

  for (let y = 0; y < CELLS_PER_TILE; y++) {
    for (let x = 0; x < CELLS_PER_TILE; x++) {
      const left = x * CELL_SIZE;
      const bottom = y * CELL_SIZE;
      const right = left + CELL_SIZE;
      const top = bottom + CELL_SIZE;
      const z = elevations[y][x];

      quad([left, bottom, z], [right, bottom, z], [right, top, z], [left, top, z]);
      quad([left, bottom, 0], [left, top, 0], [right, top, 0], [right, bottom, 0]);
      wall(left, bottom, right, bottom, elevations[y - 1]?.[x] ?? 0, z);
      wall(right, bottom, right, top, elevations[y][x + 1] ?? 0, z);
      wall(right, top, left, top, elevations[y + 1]?.[x] ?? 0, z);
      wall(left, top, left, bottom, elevations[y][x - 1] ?? 0, z);
    }
  }

  return { row, column, vertices: new Float32Array(vertices) };
}

export function generateTiles(width: number, height: number): Tile[] {
  const dimensions = [width, height];
  if (dimensions.some((size) => size < TILE_SIZE || size > MAX_DIMENSION || size % TILE_SIZE !== 0)) {
    throw new Error(`Podaj wymiary od ${TILE_SIZE} do ${MAX_DIMENSION} mm, podzielne przez ${TILE_SIZE} mm.`);
  }

  const tiles: Tile[] = [];
  for (let row = 0; row < height / TILE_SIZE; row++) {
    for (let column = 0; column < width / TILE_SIZE; column++) {
      tiles.push(buildTile(row, column));
    }
  }
  return tiles;
}
