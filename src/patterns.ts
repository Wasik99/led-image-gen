import { createRandomSquares } from './random-squares';
import { createLayoutSurface, type LayoutPiece } from './custom-layout';

export type WaveDirection = 'horizontal' | 'vertical' | 'diagonal';

export interface WaveSettings {
  maxHeight: number;
  density: number;
  direction: WaveDirection;
}

export const defaultWaveSettings: WaveSettings = {
  maxHeight: 14,
  density: 1,
  direction: 'horizontal',
};

export interface RandomSettings {
  maxHeight: number;
  seed: number;
}

export const archRoutes = {
  u: 'Łuk U',
  corner: 'Zakręt 90°',
  s: 'Eska',
  horizontal: 'Pasy poziome',
  vertical: 'Pasy pionowe',
};

export interface ArchSettings {
  route: keyof typeof archRoutes;
  rotation: number;
  shiftX: number;
  shiftY: number;
}

export const defaultArchSettings: ArchSettings = { route: 'u', rotation: 0, shiftX: 0, shiftY: 0 };

export interface PatternSettings {
  wave: WaveSettings;
  random: RandomSettings;
  grooves?: boolean;
  arches?: ArchSettings;
  customPieces?: readonly LayoutPiece[];
  invertCustomRelief?: boolean;
}

export const defaultRandomSettings: RandomSettings = { maxHeight: 14, seed: 1 };

type Elevation = (column: number, row: number) => number;

interface SteppedPattern {
  label: string;
  cellsPerTile: number;
  createElevation: (columns: number, rows: number, settings: PatternSettings) => Elevation;
}

function waveProfile(samples: number, density: number): number[] {
  return Array.from({ length: samples }, (_, index) =>
    (1 - Math.cos(2 * Math.PI * density * (index + 0.5) / samples)) / 2,
  );
}

function createSquareWave(columns: number, rows: number, settings: WaveSettings): Elevation {
  const { direction, density, maxHeight } = settings;
  let sample: Elevation;

  if (direction === 'diagonal') {
    // Sharing each diagonal sample between two neighboring diagonals prevents
    // point-only contacts where the wave changes from rising to falling.
    const diagonal = waveProfile(Math.ceil((columns + rows - 1) / 2), density);
    sample = (column, row) => diagonal[Math.floor((column + row) / 2)];
  } else {
    const horizontal = direction === 'horizontal';
    const primary = waveProfile(horizontal ? columns : rows, density);
    const cross = waveProfile(horizontal ? rows : columns, 1);
    sample = (column, row) =>
      primary[horizontal ? column : row] + 0.25 * cross[horizontal ? row : column];
  }

  // Normalize against the sampled grid so the lowest and highest fields reach 0 and maxHeight.
  let min = Infinity;
  let max = -Infinity;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const value = sample(column, row);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }

  if (min === max) return () => 0;
  return (column, row) => Math.round(maxHeight * (sample(column, row) - min) / (max - min));
}

interface ContinuousPattern {
  label: string;
  createSurface: (width: number, height: number, settings: PatternSettings) => (x: number, y: number) => number;
}

function quarterArcDistance(x: number, y: number, radius: number): number {
  if (x >= 0 && y >= 0) return Math.abs(Math.hypot(x, y) - radius);
  return Math.min(Math.hypot(x - radius, y), Math.hypot(x, y - radius));
}

function distanceFromRoute(route: ArchSettings['route'], x: number, y: number, halfHeight: number) {
  switch (route) {
    case 'u':
      return Math.hypot(x, Math.max(0, y + 0.04 * halfHeight));
    case 'corner': {
      const radius = 0.25;
      return Math.min(
        quarterArcDistance(radius - x, y + radius, radius),
        Math.hypot(x, Math.max(0, y + radius)),
        Math.hypot(Math.max(0, radius - x), y),
      );
    }
    case 's': {
      const radius = 0.21;
      return Math.min(
        quarterArcDistance(-x, y + radius, radius),
        quarterArcDistance(x, radius - y, radius),
        Math.hypot(x + radius, Math.max(0, y + radius)),
        Math.hypot(x - radius, Math.max(0, radius - y)),
      );
    }
    case 'horizontal':
      return Math.abs(y);
    case 'vertical':
      return Math.abs(x);
  }
}

function createParallelArches(width: number, height: number, { arches = defaultArchSettings }: PatternSettings) {
  const { route, rotation, shiftX, shiftY } = arches;
  const scale = Math.min(width, height);
  const angle = rotation * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const originX = width * (0.5 + shiftX / 100);
  const originY = height * (0.5 + shiftY / 100);
  const halfHeight = (rotation % 180 === 0 ? height : width) / (2 * scale);
  const spacing = 0.07;
  const halfWidth = 0.024;
  const firstRadius = route === 'u' ? 0.10 : 0;
  const lastRib = route === 'u' ? 4 : 2;
  const repeats = route === 'horizontal' || route === 'vertical';

  return (x: number, y: number) => {
    const dx = (x - originX) / scale;
    const dy = (y - originY) / scale;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    const distance = distanceFromRoute(route, localX, localY, halfHeight);
    const rib = Math.round((distance - firstRadius) / spacing);
    const offset = Math.abs(distance - (firstRadius + rib * spacing));
    if (rib < 0 || (!repeats && rib > lastRib) || offset >= halfWidth) return 0;
    return 4 * (1 + Math.cos(Math.PI * offset / halfWidth));
  };
}

function createYarn(width: number, height: number) {
  const columns = Math.max(3, Math.min(20, Math.round(Math.min(width, height) / 12)));
  const pitch = Math.min(width, height) / columns;
  const rowHeight = pitch * 1.18;

  function strandDistance(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - ax - t * dx, y - ay - t * dy);
  }

  return (x: number, y: number) => {
    // Fold the stitch along its center to trace two rounded strands forming a V.
    const column = x / pitch;
    const row = y / rowHeight;
    const u = Math.abs(column - Math.floor(column) - 0.5);
    const v = row - Math.floor(row) - 0.5;
    const distance = Math.min(
      strandDistance(u, v, 0.028, -0.35, 0.17, -0.04),
      strandDistance(u, v, 0.17, -0.04, 0.27, 0.34),
    );
    const radius = 0.15;
    if (distance >= radius) return 0;
    const profile = (1 + Math.cos(Math.PI * distance / radius)) / 2;
    return 4.2 * profile * (0.94 + 0.06 * Math.cos(2 * Math.PI * (2 * v + u)));
  };
}

export const patterns = {
  smooth: {
    label: 'Gładki',
    cellsPerTile: 1,
    createElevation: () => () => 0,
  },
  squareWave: {
    label: 'Fala z kwadratów',
    cellsPerTile: 5,
    createElevation: (columns, rows, { wave }) => createSquareWave(columns, rows, wave),
  },
  randomSquares: {
    label: 'Losowe kwadraty',
    cellsPerTile: 5,
    createElevation: (columns, rows, { random }) => createRandomSquares(columns, rows, random),
  },
  yarn: {
    label: 'Włóczka',
    createSurface: createYarn,
  },
  parallelArches: {
    label: 'Równoległe łuki',
    createSurface: createParallelArches,
  },
  customLayout: {
    label: 'Własny układ',
    createSurface: (width, height, { customPieces = [] }) => createLayoutSurface(width, height, customPieces),
  },
} satisfies Record<string, SteppedPattern | ContinuousPattern>;

export type PatternId = keyof typeof patterns;
