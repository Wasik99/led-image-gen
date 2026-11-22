import { boardScale, circleRadius, rotatePoint, squarePatch, squarePatchCells } from './custom-layout';
import { applySolidRelief, type SolidRelief } from './solid-relief';
import { MAX_DIMENSION, MIN_TILE_SIZE } from './layout';
import { defaultRandomSettings, defaultWaveSettings, patterns, type PatternId, type PatternSettings } from './patterns';

export const BASE_HEIGHT = 5;
const GROOVE_BEVEL = 0.6;
const SURFACE_STEPS_SHORT_SIDE = 280;
const CUSTOM_CURVE_STEPS_SHORT_SIDE = 420;
const SURFACE_CELL_BUDGET = 320_000;

export interface Tile {
  row: number;
  column: number;
  vertices: Float32Array;
  outline: Float32Array;
  normals?: Float32Array;
}

type MeshData = Pick<Tile, 'vertices' | 'outline' | 'normals'>;

type Point = [number, number, number];

function buildTileMesh(heights: number[][], side: number, bevel = 0, edges?: number[]): MeshData {
  const vertices: number[] = [];
  const outline: number[] = [];
  const cells = heights.length;
  const coordinate = (index: number) => edges?.[index] ?? index * side / cells;
  const rimHeights = bevel
    ? heights.map(row => row.map(z => Math.max(BASE_HEIGHT, z - bevel)))
    : heights;

  function quad(a: Point, b: Point, c: Point, d: Point) {
    vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
  }

  function cornerLevels(x: number, y: number, low: number, high: number) {
    const adjacent = [rimHeights[y - 1]?.[x - 1], rimHeights[y - 1]?.[x], rimHeights[y]?.[x - 1], rimHeights[y]?.[x]];
    const levels = adjacent.filter((z): z is number => z !== undefined && low < z && z < high);
    return [...new Set(levels)].sort((a, b) => a - b).concat(high);
  }

  function wall(ax: number, ay: number, bx: number, by: number, low: number, high: number) {
    if (low >= high) return;

    // Subdivide each wall edge at the heights of the cells meeting at its corner.
    const levelsA = cornerLevels(ax, ay, low, high);
    const levelsB = cornerLevels(bx, by, low, high);
    const leftX = coordinate(ax);
    const leftY = coordinate(ay);
    const rightX = coordinate(bx);
    const rightY = coordinate(by);
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
      const left = coordinate(x);
      const right = coordinate(x + 1);
      const bottom = coordinate(y);
      const top = coordinate(y + 1);
      const z = heights[y][x];
      const edgeZ = rimHeights[y][x];
      const inset = z - edgeZ;
      const a: Point = [left + inset, bottom + inset, z];
      const b: Point = [right - inset, bottom + inset, z];
      const c: Point = [right - inset, top - inset, z];
      const d: Point = [left + inset, top - inset, z];
      quad(a, b, c, d);
      quad([left, bottom, 0], [left, top, 0], [right, top, 0], [right, bottom, 0]);

      if (inset > 0) {
        const lowerLeft: Point = [left, bottom, edgeZ];
        const lowerRight: Point = [right, bottom, edgeZ];
        const upperRight: Point = [right, top, edgeZ];
        const upperLeft: Point = [left, top, edgeZ];
        quad(lowerLeft, lowerRight, b, a);
        quad(lowerRight, upperRight, c, b);
        quad(upperRight, upperLeft, d, c);
        quad(upperLeft, lowerLeft, a, d);
      }

      wall(x, y, x + 1, y, rimHeights[y - 1]?.[x] ?? 0, edgeZ);
      wall(x + 1, y, x + 1, y + 1, rimHeights[y][x + 1] ?? 0, edgeZ);
      wall(x + 1, y + 1, x, y + 1, rimHeights[y + 1]?.[x] ?? 0, edgeZ);
      wall(x, y + 1, x, y, rimHeights[y][x - 1] ?? 0, edgeZ);

      if (y === 0) rim(left, bottom, right, bottom, edgeZ);
      if (x === cells - 1) rim(right, bottom, right, top, edgeZ);
      if (y === cells - 1) rim(right, top, left, top, edgeZ);
      if (x === 0) rim(left, top, left, bottom, edgeZ);
    }
  }

  return { vertices: new Float32Array(vertices), outline: new Float32Array(outline) };
}

function buildContinuousMesh(side: number, steps: number, sample: (x: number, y: number) => number): MeshData {
  const coordinateCount = (2 * steps ** 2 + 12 * steps) * 9;
  const vertices = new Float32Array(coordinateCount);
  const normals = new Float32Array(coordinateCount);
  const outline: number[] = [];
  let offset = 0;
  const spacing = side / steps;
  // Sample one extra row and column on all sides for consistent normals across tile seams.
  const heights = Array.from({ length: steps + 3 }, (_, y) =>
    Float64Array.from({ length: steps + 3 }, (_, x) => sample(x - 1, y - 1)),
  );
  const points: Point[][] = [];
  const topNormals: Point[][] = [];
  for (let y = 0; y <= steps; y++) {
    const pointRow: Point[] = [];
    const normalRow: Point[] = [];
    for (let x = 0; x <= steps; x++) {
      pointRow.push([x * side / steps, y * side / steps, heights[y + 1][x + 1]]);
      const dx = heights[y + 1][x] - heights[y + 1][x + 2];
      const dy = heights[y][x + 1] - heights[y + 2][x + 1];
      const dz = 2 * spacing;
      const length = Math.hypot(dx, dy, dz);
      normalRow.push([dx / length, dy / length, dz / length]);
    }
    points.push(pointRow);
    topNormals.push(normalRow);
  }

  const floorCenter: Point = [side / 2, side / 2, 0];
  const down: Point = [0, 0, -1];

  function triangle(a: Point, b: Point, c: Point, na: Point, nb = na, nc = na) {
    vertices.set(a, offset);
    vertices.set(b, offset + 3);
    vertices.set(c, offset + 6);
    normals.set(na, offset);
    normals.set(nb, offset + 3);
    normals.set(nc, offset + 6);
    offset += 9;
  }

  function closeEdge(a: Point, b: Point, outward: Point) {
    const bottomA: Point = [a[0], a[1], 0];
    const bottomB: Point = [b[0], b[1], 0];
    triangle(bottomA, bottomB, b, outward);
    triangle(bottomA, b, a, outward);
    triangle(floorCenter, bottomB, bottomA, down);
    outline.push(a[0], a[1], a[2] + 0.05, b[0], b[1], b[2] + 0.05);
  }

  for (let y = 0; y < steps; y++) {
    for (let x = 0; x < steps; x++) {
      const a = points[y][x];
      const b = points[y][x + 1];
      const c = points[y + 1][x + 1];
      const d = points[y + 1][x];
      const na = topNormals[y][x];
      const nb = topNormals[y][x + 1];
      const nc = topNormals[y + 1][x + 1];
      const nd = topNormals[y + 1][x];
      triangle(a, b, c, na, nb, nc);
      triangle(a, c, d, na, nc, nd);
    }
  }

  for (let i = 0; i < steps; i++) {
    closeEdge(points[0][i], points[0][i + 1], [0, -1, 0]);
    closeEdge(points[i][steps], points[i + 1][steps], [1, 0, 0]);
    closeEdge(points[steps][i + 1], points[steps][i], [0, 1, 0]);
    closeEdge(points[i + 1][0], points[i][0], [-1, 0, 0]);
  }

  return { vertices, normals, outline: new Float32Array(outline) };
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

  const surface = patterns[pattern];
  const columns = width / side;
  const rows = height / side;
  let buildMesh: (column: number, rowFromBottom: number) => MeshData;

  if ('createSurface' in surface) {
    const pieces = settings.customPieces ?? [];
    const hasCustomCurve = pattern === 'customLayout' && pieces.some(piece => piece.kind === 'corner');
    const shortSideSteps = hasCustomCurve ? CUSTOM_CURVE_STEPS_SHORT_SIDE : SURFACE_STEPS_SHORT_SIDE;
    const detail = pattern === 'yarn' ? Math.max(1, 100 / (settings.yarnScale ?? 100)) : 1;
    const targetSteps = Math.ceil(detail * shortSideSteps * side / Math.min(width, height));
    // Keep a common spacing across seams and bound mesh size for very long panels.
    const maxSteps = Math.floor(Math.sqrt(SURFACE_CELL_BUDGET / (columns * rows)));
    const steps = Math.min(targetSteps, maxSteps);
    const sample = surface.createSurface(width, height, settings);
    const scale = boardScale(width, height);
    const inverted = pattern === 'customLayout' && Boolean(settings.invertCustomRelief);
    const referenceHeight = BASE_HEIGHT + (inverted ? Math.max(0, ...pieces.map(piece => piece.reliefHeight)) : 0);
    const shapes: SolidRelief[] = [];
    if (pattern === 'customLayout') {
      for (const piece of pieces) {
        if (piece.kind === 'circle') {
          shapes.push({
            x: piece.x * scale, y: height - piece.y * scale,
            radius: circleRadius * piece.size * scale, height: piece.reliefHeight,
          });
        } else if (piece.kind === 'squarePatch') {
          const cells = squarePatchCells(
            piece.squareSeed ?? 1, piece.squareColumns ?? squarePatch.columns,
            piece.squareRows ?? squarePatch.rows, squarePatch.cellMm,
          );
          for (const cell of cells) {
            const offset = rotatePoint(cell, piece.rotation);
            const rise = cell.rise * piece.reliefHeight;
            if (rise <= 0) continue;
            shapes.push({
              x: piece.x * scale + offset.x,
              y: height - piece.y * scale - offset.y,
              width: cell.width, depth: cell.depth, rotation: -piece.rotation, height: rise,
            });
          }
        }
      }
    }
    const flatBase = pattern === 'customLayout' && pieces.every(piece => piece.kind === 'circle' || piece.kind === 'squarePatch')
      ? buildTileMesh([[referenceHeight]], side) : undefined;
    buildMesh = (column, row) => {
      const originX = column * side;
      const originY = row * side;
      const base = flatBase ?? buildContinuousMesh(side, steps, (x, y) => {
        const globalX = (column * steps + x) * side / steps;
        const globalY = (row * steps + y) * side / steps;
        const relief = sample(globalX, globalY);
        return referenceHeight + (inverted ? -relief : relief);
      });
      const nearby = shapes.map(shape => ({ ...shape, x: shape.x - originX, y: shape.y - originY }))
        .filter(shape => {
          const { x, y } = shape;
          const extent = 'radius' in shape ? shape.radius : Math.hypot(shape.width, shape.depth) / 2;
          return x + extent > 0 && x - extent < side && y + extent > 0 && y - extent < side;
        });
      return nearby.length ? applySolidRelief(base.vertices, side, referenceHeight, nearby, inverted) : base;
    };
  } else if (pattern === 'smooth') {
    const mesh = buildTileMesh([[BASE_HEIGHT]], side);
    buildMesh = () => mesh;
  } else {
    const { cellsPerTile, createElevation } = surface;
    const elevation = createElevation(columns * cellsPerTile, rows * cellsPerTile, settings);
    const heights = Array.from({ length: rows * cellsPerTile }, (_, y) =>
      Array.from({ length: columns * cellsPerTile }, (_, x) => Math.fround(BASE_HEIGHT + elevation(x, y))),
    );
    const bevel = settings.grooves ? GROOVE_BEVEL : 0;
    const inset = squarePatch.grooveMm / 2;
    const pitch = side / cellsPerTile;
    const edges = [0];
    for (let index = 0; index < cellsPerTile; index++) {
      edges.push(index * pitch + inset, (index + 1) * pitch - inset);
    }
    edges.push(side);

    buildMesh = (column, row) => {
      const startX = column * cellsPerTile;
      const startY = row * cellsPerTile;
      // Even rows and columns form the grooves, including half a groove at each tile edge.
      const spaced = Array.from({ length: cellsPerTile * 2 + 1 }, (_, y) =>
        Array.from({ length: cellsPerTile * 2 + 1 }, (_, x) =>
          x % 2 && y % 2 ? heights[startY + (y - 1) / 2][startX + (x - 1) / 2] : BASE_HEIGHT,
        ),
      );
      return buildTileMesh(spaced, side, bevel, edges);
    };
  }

  const tiles: Tile[] = [];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const mesh = buildMesh(column, rows - 1 - row);
      tiles.push({ row, column, ...mesh });
    }
  }
  return tiles;
}
