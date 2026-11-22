export function createRandomSquares(columns: number, rows: number, settings: { seed: number; maxHeight: number }) {
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

  return (column: number, row: number) => heights[row][column] * settings.maxHeight;
}
