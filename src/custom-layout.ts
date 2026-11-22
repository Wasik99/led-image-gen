import { createRandomSquares } from './random-squares';

export type PieceKind = 'straight' | 'corner' | 'circle' | 'squarePatch';
export interface BoardPoint { x: number; y: number }
export interface PieceDimensions {
  size: number;
  railCount: number;
  reliefHeight: number;
}

export interface LayoutPiece extends BoardPoint, PieceDimensions {
  id: number;
  kind: PieceKind;
  rotation: number;
  length?: number;
  squareSeed?: number;
  squareColumns?: number;
  squareRows?: number;
}

export const defaultPieceHeight = 8;

const straightHalfLength = 15;
const radius = 16;
export const circleRadius = 16;
export const squarePatch = { columns: 6, rows: 4, cell: 6, cellMm: 10, maxCells: 16 };

export function squarePatchElevation(seed: number) {
  return createRandomSquares(squarePatch.maxCells, squarePatch.maxCells, { seed, maxHeight: 1 });
}
const railSpacing = 3.5;
const railHalfWidth = 1.2;
const snapDistance = 4;

interface Endpoint extends BoardPoint {
  heading: number;
}

const endpoints: Record<PieceKind, Endpoint[]> = {
  straight: [{ x: -straightHalfLength, y: 0, heading: 180 }, { x: straightHalfLength, y: 0, heading: 0 }],
  corner: [{ x: -8, y: 8, heading: 90 }, { x: 8, y: -8, heading: 0 }],
  circle: [],
  squarePatch: [],
};

export function boardScale(width: number, height: number) {
  return Math.min(width, height) / 100;
}

export function pieceBoardScale(piece: LayoutPiece, millimetersPerUnit: number) {
  return piece.kind === 'squarePatch'
    ? squarePatch.cellMm / (squarePatch.cell * millimetersPerUnit)
    : piece.size;
}

function railOffsets(count: number) {
  return Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * railSpacing);
}

export function pieceHitWidth(count: number) {
  return (count - 1) * railSpacing + 2 * railHalfWidth;
}

export function railPath(kind: PieceKind, offset = 0, length = 1): string {
  const railRadius = radius + offset;
  const halfLength = straightHalfLength * length;
  return kind === 'straight'
    ? `M -${halfLength} ${offset} H ${halfLength}`
    : `M ${8 - railRadius} 8 A ${railRadius} ${railRadius} 0 0 1 8 ${8 - railRadius}`;
}

export function railPaths(piece: Pick<LayoutPiece, 'kind' | 'railCount' | 'length'>): string[] {
  return railOffsets(piece.railCount).map(offset => railPath(piece.kind, offset, piece.length));
}

const rotationVectors = Array.from({ length: 12 }, (_, index) => {
  const radians = index * Math.PI / 6;
  return { cos: Math.round(Math.cos(radians) * 1e12) / 1e12, sin: Math.round(Math.sin(radians) * 1e12) / 1e12 };
});

export function rotatePoint(point: BoardPoint, degrees: number): BoardPoint {
  const { cos, sin } = rotationVectors[((degrees / 30) % 12 + 12) % 12];
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

function pieceEndpoints(piece: LayoutPiece): Endpoint[] {
  return endpoints[piece.kind].map(end => {
    const offset = rotatePoint({ ...end, x: end.x * (piece.length ?? 1) }, piece.rotation);
    return {
      x: piece.x + offset.x * piece.size,
      y: piece.y + offset.y * piece.size,
      heading: (end.heading + piece.rotation) % 360,
    };
  });
}

function faceEachOther(a: Endpoint, b: Endpoint) {
  return (a.heading + 180) % 360 === b.heading;
}

export function resizeStraightPiece(piece: LayoutPiece, length: number, pieces: LayoutPiece[]) {
  const ends = pieceEndpoints(piece);
  const anchor = ends.findIndex(end => pieces.some(other =>
    other !== piece && other.size === piece.size && other.railCount === piece.railCount &&
    pieceEndpoints(other).some(target => faceEachOther(end, target) &&
      Math.hypot(end.x - target.x, end.y - target.y) < 1e-6),
  ));
  piece.length = length;
  if (anchor >= 0) {
    const moved = pieceEndpoints(piece)[anchor];
    piece.x += ends[anchor].x - moved.x;
    piece.y += ends[anchor].y - moved.y;
  }
}

export function connectedPieces(selected: LayoutPiece, pieces: LayoutPiece[]): LayoutPiece[] {
  const group = [selected];
  const added = new Set(group);
  for (const piece of group) {
    const ends = pieceEndpoints(piece);
    for (const other of pieces) {
      if (added.has(other) || other.size !== piece.size || other.railCount !== piece.railCount) continue;
      if (pieceEndpoints(other).some(target => ends.some(end =>
        faceEachOther(end, target) && Math.hypot(end.x - target.x, end.y - target.y) < 1e-6,
      ))) {
        group.push(other);
        added.add(other);
      }
    }
  }
  return group;
}

export function snapPiece(piece: LayoutPiece, others: LayoutPiece[], width: number, height: number, margin: number) {
  let best: { point: BoardPoint; joint: BoardPoint; dimensions: PieceDimensions } | undefined;
  let bestDistance = snapDistance;
  const originalEnds = pieceEndpoints(piece);
  for (const other of others) {
    if (other.id === piece.id) continue;
    const dimensions = { size: other.size, railCount: other.railCount, reliefHeight: other.reliefHeight };
    const adjustedEnds = pieceEndpoints({ ...piece, ...dimensions });
    for (const joint of pieceEndpoints(other)) {
      for (const [index, end] of adjustedEnds.entries()) {
        if (!faceEachOther(end, joint)) continue;
        const point = { x: piece.x + joint.x - end.x, y: piece.y + joint.y - end.y };
        if (point.x < -margin || point.y < -margin || point.x > width + margin || point.y > height + margin) continue;
        const original = originalEnds[index];
        const distance = Math.min(
          Math.hypot(end.x - joint.x, end.y - joint.y),
          Math.hypot(original.x - joint.x, original.y - joint.y),
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { point, joint, dimensions };
        }
      }
    }
  }
  return best;
}

function reliefForPiece(kind: PieceKind, x: number, y: number, offsets: number[], halfLength: number): number {
  function distanceToRail(offset: number) {
    if (kind === 'straight') return Math.hypot(Math.max(0, Math.abs(x) - halfLength), y - offset);
    const r = radius + offset;
    const dx = 8 - x;
    const dy = 8 - y;
    if (dx >= 0 && dy >= 0) return Math.abs(Math.hypot(dx, dy) - r);
    return Math.min(Math.hypot(dx - r, dy), Math.hypot(dx, dy - r));
  }

  let distance = railHalfWidth;
  for (const offset of offsets) distance = Math.min(distance, distanceToRail(offset));
  return distance < railHalfWidth ? (1 + Math.cos(Math.PI * distance / railHalfWidth)) / 2 : 0;
}

export function createLayoutSurface(width: number, height: number, pieces: readonly LayoutPiece[]) {
  const scale = boardScale(width, height);
  const prepared = pieces.filter(piece => piece.kind !== 'circle').map(piece => ({
    piece,
    offsets: railOffsets(piece.railCount),
    halfLength: straightHalfLength * (piece.length ?? 1),
    columns: piece.squareColumns ?? squarePatch.columns,
    rows: piece.squareRows ?? squarePatch.rows,
    squares: piece.kind === 'squarePatch' ? squarePatchElevation(piece.squareSeed ?? 1) : undefined,
    localScale: pieceBoardScale(piece, scale),
    extent: pieceBoardScale(piece, scale) * (piece.kind === 'squarePatch'
      ? Math.max(piece.squareColumns ?? squarePatch.columns, piece.squareRows ?? squarePatch.rows) * squarePatch.cell / 2
      : Math.max(straightHalfLength * (piece.length ?? 1), 8 + (piece.railCount - 1) * railSpacing / 2) + railHalfWidth),
  }));
  return (sampleX: number, sampleY: number) => {
    const x = sampleX / scale;
    const y = (height - sampleY) / scale;
    let elevation = 0;
    for (const { piece, offsets, extent, halfLength, squares, columns, rows, localScale } of prepared) {
      const dx = x - piece.x;
      const dy = y - piece.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > extent * Math.SQRT2) continue;
      const local = rotatePoint({ x: dx, y: dy }, -piece.rotation);
      const localX = local.x / localScale;
      const localY = local.y / localScale;
      if (squares) {
        const column = Math.floor(localX / squarePatch.cell + columns / 2);
        const row = Math.floor(localY / squarePatch.cell + rows / 2);
        if (column >= 0 && column < columns && row >= 0 && row < rows) {
          elevation = Math.max(elevation, piece.reliefHeight * squares(column, row));
        }
      } else {
        elevation = Math.max(elevation, piece.reliefHeight * reliefForPiece(piece.kind, localX, localY, offsets, halfLength));
      }
    }
    return elevation;
  };
}
