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

type Elevation = (column: number, row: number) => number;

interface SurfacePattern {
  label: string;
  cellsPerTile: number;
  createElevation: (columns: number, rows: number, settings: WaveSettings) => Elevation;
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

export const patterns: Record<'smooth' | 'squareWave', SurfacePattern> = {
  smooth: {
    label: 'Gładki',
    cellsPerTile: 1,
    createElevation: () => () => 0,
  },
  squareWave: {
    label: 'Fala z kwadratów',
    cellsPerTile: 5,
    createElevation: createSquareWave,
  },
};

export type PatternId = keyof typeof patterns;
