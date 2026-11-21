export type PieceKind = 'straight' | 'corner';
export interface BoardPoint { x: number; y: number }
export interface LayoutPiece extends BoardPoint {
  id: number;
  kind: PieceKind;
  rotation: number;
}

const straightHalfLength = 15;
const radius = 16;
const railOffsets = [-7, -3.5, 0, 3.5, 7];
const railHalfWidth = 1.2;
const snapDistance = 4;

interface Endpoint extends BoardPoint {
  heading: number;
}

const endpoints: Record<PieceKind, Endpoint[]> = {
  straight: [{ x: -15, y: 0, heading: 2 }, { x: 15, y: 0, heading: 0 }],
  corner: [{ x: -8, y: 8, heading: 1 }, { x: 8, y: -8, heading: 0 }],
};

export function boardScale(width: number, height: number) {
  return Math.min(width, height) / 100;
}

export const pieceHitWidth = 2 * (Math.max(...railOffsets) + railHalfWidth);

export function railPath(kind: PieceKind, offset = 0): string {
  const railRadius = radius + offset;
  return kind === 'straight'
    ? `M -${straightHalfLength} ${offset} H ${straightHalfLength}`
    : `M ${8 - railRadius} 8 A ${railRadius} ${railRadius} 0 0 1 8 ${8 - railRadius}`;
}

export function railPaths(kind: PieceKind): string[] {
  return railOffsets.map(offset => railPath(kind, offset));
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

export function snapPiece(piece: LayoutPiece, others: LayoutPiece[], width: number, height: number) {
  let best: { point: BoardPoint; joint: BoardPoint } | undefined;
  let bestDistance = snapDistance;
  for (const end of endpoints[piece.kind]) {
    const relative = rotate(end, piece.rotation);
    const heading = (end.heading + piece.rotation) % 4;
    for (const other of others) {
      if (other.id === piece.id) continue;
      for (const target of endpoints[other.kind]) {
        if ((target.heading + other.rotation + 2) % 4 !== heading) continue;
        const otherEnd = rotate(target, other.rotation);
        const joint = { x: other.x + otherEnd.x, y: other.y + otherEnd.y };
        const point = { x: joint.x - relative.x, y: joint.y - relative.y };
        if (point.x < 0 || point.y < 0 || point.x > width || point.y > height) continue;
        const distance = Math.hypot(point.x - piece.x, point.y - piece.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { point, joint };
        }
      }
    }
  }
  return best;
}

function reliefForPiece(kind: PieceKind, x: number, y: number): number {
  const distanceToRail = kind === 'straight'
    ? (offset: number) => Math.hypot(Math.max(0, Math.abs(x) - straightHalfLength), y - offset)
    : (offset: number) => {
      const dx = 8 - x;
      const dy = 8 - y;
      const r = radius + offset;
      if (dx >= 0 && dy >= 0) return Math.abs(Math.hypot(dx, dy) - r);
      return Math.min(Math.hypot(dx - r, dy), Math.hypot(dx, dy - r));
    };

  let distance = railHalfWidth;
  for (const offset of railOffsets) distance = Math.min(distance, distanceToRail(offset));
  return distance < railHalfWidth ? 4 * (1 + Math.cos(Math.PI * distance / railHalfWidth)) : 0;
}

export function createLayoutSurface(width: number, height: number, pieces: readonly LayoutPiece[]) {
  const scale = boardScale(width, height);
  return (sampleX: number, sampleY: number) => {
    const x = sampleX / scale;
    const y = (height - sampleY) / scale;
    let elevation = 0;
    for (const piece of pieces) {
      const dx = x - piece.x;
      const dy = y - piece.y;
      if (Math.abs(dx) > 17 || Math.abs(dy) > 17) continue;
      const local = rotate({ x: dx, y: dy }, 4 - piece.rotation);
      elevation = Math.max(elevation, reliefForPiece(piece.kind, local.x, local.y));
    }
    return elevation;
  };
}
