export const MIN_TILE_SIZE = 50;
export const MAX_DIMENSION = 2000;

export interface ImageSize {
  width: number;
  height: number;
}

export function findLayout(image: ImageSize, bed: ImageSize) {
  if (![image.width, image.height].every((size) =>
    Number.isSafeInteger(size) && size >= 1 && size <= MAX_DIMENSION,
  )) {
    throw new Error(`Podaj wymiary obrazu od 1 do ${MAX_DIMENSION} mm w pełnych milimetrach.`);
  }

  if (![bed.width, bed.height].every((size) => Number.isSafeInteger(size) && size > 0)) {
    throw new Error('Podaj oba wymiary stołu w pełnych, dodatnich milimetrach.');
  }

  const maxTileSize = Math.min(bed.width, bed.height, MAX_DIMENSION);
  if (maxTileSize < MIN_TILE_SIZE) {
    throw new Error(`Pole robocze musi pomieścić kafelek ${MIN_TILE_SIZE} × ${MIN_TILE_SIZE} mm.`);
  }

  const tileSizes: number[] = [];
  for (let side = Math.min(maxTileSize, image.width, image.height); side >= MIN_TILE_SIZE; side--) {
    if (image.width % side === 0 && image.height % side === 0) tileSizes.push(side);
  }

  if (tileSizes.length) return { tileSizes };

  // Try each usable tile size. For a given size, each axis can be rounded independently.
  let suggestion: ImageSize | undefined;
  let bestDistance = Infinity;
  for (let side = maxTileSize; side >= MIN_TILE_SIZE; side--) {
    const maxTiles = Math.floor(MAX_DIMENSION / side);
    const width = Math.max(1, Math.min(maxTiles, Math.round(image.width / side))) * side;
    const height = Math.max(1, Math.min(maxTiles, Math.round(image.height / side))) * side;
    const distance = (image.width - width) ** 2 + (image.height - height) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      suggestion = { width, height };
    }
  }
  return { tileSizes, suggestion };
}
