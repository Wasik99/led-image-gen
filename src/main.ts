import { exportTiles } from './export';
import { generateTiles, TILE_SIZE, type Tile } from './geometry';
import { createPreview } from './preview';
import './style.css';

const widthInput = document.querySelector<HTMLInputElement>('#width')!;
const heightInput = document.querySelector<HTMLInputElement>('#height')!;
const viewport = document.querySelector<HTMLElement>('#viewport')!;
const count = document.querySelector<HTMLElement>('#tile-count')!;
const info = document.querySelector<HTMLElement>('#preview-info')!;
const error = document.querySelector<HTMLElement>('#error')!;
const download = document.querySelector<HTMLButtonElement>('#download')!;
let tiles: Tile[] = [];
let showTiles: ReturnType<typeof createPreview> | undefined;

try {
  showTiles = createPreview(viewport);
} catch {
  viewport.textContent = 'Podgląd 3D wymaga przeglądarki z obsługą WebGL.';
  viewport.classList.add('unavailable');
}

function update() {
  const width = widthInput.valueAsNumber;
  const height = heightInput.valueAsNumber;

  try {
    tiles = generateTiles(width, height);
  } catch (problem) {
    tiles = [];
    error.textContent = (problem as Error).message;
    error.hidden = false;
    download.disabled = true;
    count.textContent = '—';
    info.textContent = 'Podaj poprawne wymiary, aby zaktualizować podgląd.';
    return;
  }

  error.hidden = true;
  count.textContent = String(tiles.length);
  info.textContent = `${width} × ${height} mm · Siatka ${width / TILE_SIZE} × ${height / TILE_SIZE}`;
  download.disabled = false;
  showTiles?.(tiles, width, height);
}

widthInput.addEventListener('input', update);
heightInput.addEventListener('input', update);
download.addEventListener('click', () => {
  const blob = new Blob([exportTiles(tiles)], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `obraz-${widthInput.valueAsNumber}x${heightInput.valueAsNumber}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

update();
