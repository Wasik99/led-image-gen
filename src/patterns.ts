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

export interface PatternSettings {
  wave: WaveSettings;
  random: RandomSettings;
}

export const defaultRandomSettings: RandomSettings = { maxHeight: 14, seed: 1 };

type Elevation = (column: number, row: number) => number;

interface SurfacePattern {
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

function createRandomSquares(columns: number, rows: number, settings: RandomSettings): Elevation {
  let state = settings.seed >>> 0;
  const heights = Array.from({ length: rows }, () => new Float64Array(columns));

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      let min = 0;
      let max = 1;
      if (row > 0 && column > 0) {
        const previousColumn = heights[row][column - 1];
        const previousRow = heights[row - 1][column];
        const diagonal = heights[row - 1][column - 1];
        const lowerNeighbor = Math.min(previousColumn, previousRow);
        const higherNeighbor = Math.max(previousColumn, previousRow);
        // Prevent opposite corners from touching only along a vertical edge.
        if (diagonal < lowerNeighbor) min = lowerNeighbor;
        if (diagonal > higherNeighbor) max = higherNeighbor;
      }
      // Sample reproducibly so changing the height rescales the same arrangement.
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      heights[row][column] = min + (max - min) * (state / 2 ** 32);
    }
  }

  return (column, row) => heights[row][column] * settings.maxHeight;
}

export const patterns: Record<'smooth' | 'squareWave' | 'randomSquares', SurfacePattern> = {
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
};

export type PatternId = keyof typeof patterns;
