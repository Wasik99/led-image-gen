export type PieceKind = 'straight' | 'corner' | 'circle';
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
}

export const defaultPieceHeight = 8;

const straightHalfLength = 15;
const radius = 16;
export const circleRadius = 16;
const railSpacing = 3.5;
const railHalfWidth = 1.2;
const snapDistance = 4;

interface Endpoint extends BoardPoint {
  heading: number;
}

const endpoints: Record<PieceKind, Endpoint[]> = {
  straight: [{ x: -15, y: 0, heading: 2 }, { x: 15, y: 0, heading: 0 }],
  corner: [{ x: -8, y: 8, heading: 1 }, { x: 8, y: -8, heading: 0 }],
  circle: [],
};

export function boardScale(width: number, height: number) {
  return Math.min(width, height) / 100;
}

function railOffsets(count: number) {
  return Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * railSpacing);
}

export function pieceHitWidth(count: number) {
  return (count - 1) * railSpacing + 2 * railHalfWidth;
}

export function railPath(kind: PieceKind, offset = 0): string {
  const railRadius = radius + offset;
  return kind === 'straight'
    ? `M -${straightHalfLength} ${offset} H ${straightHalfLength}`
    : `M ${8 - railRadius} 8 A ${railRadius} ${railRadius} 0 0 1 8 ${8 - railRadius}`;
}

export function railPaths(piece: LayoutPiece): string[] {
  return railOffsets(piece.railCount).map(offset => railPath(piece.kind, offset));
}

function rotate(point: BoardPoint, turn: number): BoardPoint {
  const { x, y } = point;
  switch (turn % 4) {
    case 1: return { x: -y, y: x };
    case 2: return { x: -x, y: -y };
    case 3: return { x: y, y: -x };
    default: return point;
  }
}

function pieceEndpoints(piece: LayoutPiece): Endpoint[] {
  return endpoints[piece.kind].map(end => {
    const offset = rotate(end, piece.rotation);
    return {
      x: piece.x + offset.x * piece.size,
      y: piece.y + offset.y * piece.size,
      heading: (end.heading + piece.rotation) % 4,
    };
  });
}

function faceEachOther(a: Endpoint, b: Endpoint) {
  return (a.heading + 2) % 4 === b.heading;
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

function reliefForPiece(kind: PieceKind, x: number, y: number, offsets: number[]): number {
  function distanceToRail(offset: number) {
    if (kind === 'straight') return Math.hypot(Math.max(0, Math.abs(x) - straightHalfLength), y - offset);
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
    extent: piece.size * (Math.max(straightHalfLength, 8 + (piece.railCount - 1) * railSpacing / 2) + railHalfWidth),
  }));
  return (sampleX: number, sampleY: number) => {
    const x = sampleX / scale;
    const y = (height - sampleY) / scale;
    let elevation = 0;
    for (const { piece, offsets, extent } of prepared) {
      const dx = x - piece.x;
      const dy = y - piece.y;
      if (Math.abs(dx) > extent || Math.abs(dy) > extent) continue;
      const local = rotate({ x: dx, y: dy }, 4 - piece.rotation);
      elevation = Math.max(elevation, piece.reliefHeight * reliefForPiece(piece.kind, local.x / piece.size, local.y / piece.size, offsets));
    }
    return elevation;
  };
}
