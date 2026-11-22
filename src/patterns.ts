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
  yarnScale?: number;
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

function createYarn(width: number, height: number, { yarnScale = 100 }: PatternSettings) {
  const columns = Math.max(3, Math.min(20, Math.round(Math.min(width, height) / 12)));
  const pitch = Math.min(width, height) / columns * yarnScale / 100;
  const rowSpacing = 0.57;

  function lobe(x: number, y: number, direction: number) {
    const dx = direction * x - 0.23;
    const along = 0.54 * dx + 0.842 * y;
    const across = 0.842 * dx - 0.54 * y;
    const radius = (along / 0.41) ** 2 + (across / 0.22) ** 2;
    return radius < 1 ? (1 - radius) ** 0.8 : 0;
  }

  return (x: number, y: number) => {
    const u = x / pitch;
    const v = y / pitch;
    const column = Math.floor(u);
    const row = Math.floor(v / rowSpacing);
    let knit = 0;
    // Sample neighboring stitches as their rounded arms tuck into the next row.
    for (let j = row - 1; j <= row + 1; j++) {
      const dy = v - (j + 0.5) * rowSpacing;
      for (let i = column - 1; i <= column + 1; i++) {
        const dx = u - (i + 0.5);
        knit = Math.max(knit, lobe(dx, dy, -1), lobe(dx, dy, 1));
      }
    }
    return 0.65 + 3.55 * knit;
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
