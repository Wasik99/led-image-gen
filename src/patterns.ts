interface SurfacePattern {
  label: string;
  cellsPerTile: number;
  elevation: (column: number, row: number) => number;
}

const columnWave = [0, 1, 3, 5, 4, 2, 1, 0];
const rowWave = [0, 1, 2, 1, 0, 1, 2, 1];

export const patterns = {
  smooth: {
    label: 'Gładki',
    cellsPerTile: 1,
    elevation: () => 0,
  },
  squareWave: {
    label: 'Fala z kwadratów',
    cellsPerTile: 5,
    // Independent profiles avoid diagonal-only contacts at stepped corners.
    elevation: (column, row) =>
      2 * (columnWave[column % columnWave.length] + rowWave[row % rowWave.length]),
  },
} satisfies Record<string, SurfacePattern>;

export type PatternId = keyof typeof patterns;
