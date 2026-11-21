import { exportTiles } from './export';
import { generateTiles, type Tile } from './geometry';
import { findLayout, type ImageSize } from './layout';
import { patterns, type PatternId } from './patterns';
import { createPreview } from './preview';
import './style.css';

const widthInput = document.querySelector<HTMLInputElement>('#width')!;
const heightInput = document.querySelector<HTMLInputElement>('#height')!;
const bedWidthInput = document.querySelector<HTMLInputElement>('#bed-width')!;
const bedHeightInput = document.querySelector<HTMLInputElement>('#bed-height')!;
const tileSize = document.querySelector<HTMLSelectElement>('#tile-size')!;
const patternInput = document.querySelector<HTMLSelectElement>('#pattern')!;
const viewport = document.querySelector<HTMLElement>('#viewport')!;
const count = document.querySelector<HTMLElement>('#tile-count')!;
const info = document.querySelector<HTMLElement>('#preview-info')!;
const error = document.querySelector<HTMLElement>('#error')!;
const suggestionPanel = document.querySelector<HTMLElement>('#suggestion')!;
const suggestionText = document.querySelector<HTMLElement>('#suggestion-text')!;
const applySuggestion = document.querySelector<HTMLButtonElement>('#apply-suggestion')!;
const download = document.querySelector<HTMLButtonElement>('#download')!;

let tiles: Tile[] = [];
let suggestion: ImageSize | undefined;
let showTiles: ReturnType<typeof createPreview> | undefined;

try {
  showTiles = createPreview(viewport);
} catch {
  viewport.textContent = 'Podgląd 3D wymaga przeglądarki z obsługą WebGL.';
  viewport.classList.add('unavailable');
}

function renderLayout() {
  const width = widthInput.valueAsNumber;
  const height = heightInput.valueAsNumber;
  const side = Number(tileSize.value);
  tiles = side ? generateTiles(width, height, side, patternInput.value as PatternId) : [];
  download.disabled = tiles.length === 0;
  count.textContent = tiles.length ? String(tiles.length) : '—';
  info.textContent = tiles.length
    ? `${width} × ${height} mm · Siatka ${width / side} × ${height / side}`
    : 'Brak podziału dla bieżących wymiarów.';
  showTiles?.(tiles, width, height, side);
}

function update() {
  tileSize.replaceChildren();
  tileSize.disabled = true;
  error.hidden = true;
  suggestionPanel.hidden = true;
  suggestion = undefined;

  try {
    const layout = findLayout(
      { width: widthInput.valueAsNumber, height: heightInput.valueAsNumber },
      { width: bedWidthInput.valueAsNumber, height: bedHeightInput.valueAsNumber },
    );
    for (const side of layout.tileSizes) {
      tileSize.add(new Option(`${side} × ${side} mm`, String(side)));
    }
    tileSize.disabled = !layout.tileSizes.length;
    suggestion = layout.suggestion;
    if (suggestion) {
      suggestionText.textContent = `Najbliższy pasujący obraz: ${suggestion.width} × ${suggestion.height} mm.`;
      suggestionPanel.hidden = false;
    }
  } catch (problem) {
    error.textContent = (problem as Error).message;
    error.hidden = false;
  }

  renderLayout();
}

for (const input of [widthInput, heightInput, bedWidthInput, bedHeightInput]) {
  input.addEventListener('input', update);
}
tileSize.addEventListener('change', renderLayout);
for (const [id, pattern] of Object.entries(patterns)) {
  patternInput.add(new Option(pattern.label, id));
}
patternInput.addEventListener('change', renderLayout);
applySuggestion.addEventListener('click', () => {
  if (!suggestion) return;
  widthInput.value = String(suggestion.width);
  heightInput.value = String(suggestion.height);
  update();
});
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
