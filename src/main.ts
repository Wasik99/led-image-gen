import { exportTiles } from './export';
import { generateTiles, type Tile } from './geometry';
import { createLayoutEditor } from './layout-editor';
import { findLayout, type ImageSize } from './layout';
import { archRoutes, defaultRandomSettings, defaultWaveSettings, patterns, type PatternId, type WaveDirection } from './patterns';
import { createPreview } from './preview';
import './style.css';

const widthInput = document.querySelector<HTMLInputElement>('#width')!;
const heightInput = document.querySelector<HTMLInputElement>('#height')!;
const bedWidthInput = document.querySelector<HTMLInputElement>('#bed-width')!;
const bedHeightInput = document.querySelector<HTMLInputElement>('#bed-height')!;
const tileSize = document.querySelector<HTMLSelectElement>('#tile-size')!;
const patternInput = document.querySelector<HTMLSelectElement>('#pattern')!;
const grooveOption = document.querySelector<HTMLElement>('#groove-option')!;
const grooves = document.querySelector<HTMLInputElement>('#grooves')!;
const wavePanel = document.querySelector<HTMLFieldSetElement>('#wave-settings')!;
const waveHeight = document.querySelector<HTMLInputElement>('#wave-height')!;
const waveDensity = document.querySelector<HTMLInputElement>('#wave-density')!;
const waveDirection = document.querySelector<HTMLSelectElement>('#wave-direction')!;
const waveHeightValue = document.querySelector<HTMLOutputElement>('#wave-height-value')!;
const waveDensityValue = document.querySelector<HTMLOutputElement>('#wave-density-value')!;
const randomPanel = document.querySelector<HTMLFieldSetElement>('#random-settings')!;
const randomHeight = document.querySelector<HTMLInputElement>('#random-height')!;
const randomHeightValue = document.querySelector<HTMLOutputElement>('#random-height-value')!;
const reroll = document.querySelector<HTMLButtonElement>('#reroll')!;
const hideDivision = document.querySelector<HTMLInputElement>('#hide-division')!;
const archPanel = document.querySelector<HTMLFieldSetElement>('#arch-settings')!;
const archRoute = document.querySelector<HTMLSelectElement>('#arch-route')!;
const archRotation = document.querySelector<HTMLSelectElement>('#arch-rotation')!;
const archShiftX = document.querySelector<HTMLInputElement>('#arch-shift-x')!;
const archShiftY = document.querySelector<HTMLInputElement>('#arch-shift-y')!;
const archShiftXValue = document.querySelector<HTMLOutputElement>('#arch-shift-x-value')!;
const archShiftYValue = document.querySelector<HTMLOutputElement>('#arch-shift-y-value')!;
const editorPanel = document.querySelector<HTMLElement>('#layout-editor')!;
const viewport = document.querySelector<HTMLElement>('#viewport')!;
const count = document.querySelector<HTMLElement>('#tile-count')!;
const info = document.querySelector<HTMLElement>('#preview-info')!;
const error = document.querySelector<HTMLElement>('#error')!;
const suggestionPanel = document.querySelector<HTMLElement>('#suggestion')!;
const suggestionText = document.querySelector<HTMLElement>('#suggestion-text')!;
const applySuggestion = document.querySelector<HTMLButtonElement>('#apply-suggestion')!;
const download = document.querySelector<HTMLButtonElement>('#download')!;

let randomSeed = crypto.getRandomValues(new Uint32Array(1))[0];
let tiles: Tile[] = [];
let suggestion: ImageSize | undefined;
let preview: ReturnType<typeof createPreview> | undefined;

try {
  preview = createPreview(viewport);
  preview.setOutlinesVisible(!hideDivision.checked);
} catch {
  viewport.textContent = 'Podgląd 3D wymaga przeglądarki z obsługą WebGL.';
  viewport.classList.add('unavailable');
  hideDivision.disabled = true;
}

let editorUpdate: ReturnType<typeof setTimeout> | undefined;
const editor = createLayoutEditor(editorPanel, () => {
  download.disabled = true;
  if (editorUpdate === undefined) editorUpdate = setTimeout(renderLayout, 90);
});

function renderLayout() {
  clearTimeout(editorUpdate);
  editorUpdate = undefined;
  const width = widthInput.valueAsNumber;
  const height = heightInput.valueAsNumber;
  const side = Number(tileSize.value);
  const pattern = patternInput.value as PatternId;
  const waveSettings = {
    maxHeight: waveHeight.valueAsNumber,
    density: waveDensity.valueAsNumber,
    direction: waveDirection.value as WaveDirection,
  };
  const random = { maxHeight: randomHeight.valueAsNumber, seed: randomSeed };
  const arches = {
    route: archRoute.value as keyof typeof archRoutes,
    rotation: Number(archRotation.value),
    shiftX: archShiftX.valueAsNumber,
    shiftY: archShiftY.valueAsNumber,
  };
  editorPanel.hidden = pattern !== 'customLayout' || !side;
  if (!editorPanel.hidden) editor.setSize(width, height);
  archPanel.hidden = pattern !== 'parallelArches';
  archShiftXValue.value = `${arches.shiftX}%`;
  archShiftYValue.value = `${arches.shiftY}%`;
  randomPanel.hidden = pattern !== 'randomSquares';
  randomHeightValue.value = `${random.maxHeight} mm`;
  reroll.disabled = !side;
  grooveOption.hidden = pattern !== 'squareWave' && pattern !== 'randomSquares';
  wavePanel.hidden = pattern !== 'squareWave';
  waveHeightValue.value = `${waveSettings.maxHeight} mm`;
  waveDensityValue.value = String(waveSettings.density);
  tiles = side ? generateTiles(width, height, side, pattern, { wave: waveSettings, random, arches, customPieces: editor.pieces, grooves: grooves.checked }) : [];
  download.disabled = tiles.length === 0;
  count.textContent = tiles.length ? String(tiles.length) : '—';
  info.textContent = tiles.length
    ? `${width} × ${height} mm · Siatka ${width / side} × ${height / side}`
    : 'Brak podziału dla bieżących wymiarów.';
  preview?.showTiles(tiles, width, height, side);
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
hideDivision.addEventListener('change', () => {
  preview?.setOutlinesVisible(!hideDivision.checked);
});
for (const [id, pattern] of Object.entries(patterns)) {
  patternInput.add(new Option(pattern.label, id));
}
randomHeight.value = String(defaultRandomSettings.maxHeight);
randomHeight.addEventListener('input', renderLayout);
reroll.addEventListener('click', () => {
  randomSeed = (randomSeed + 1) >>> 0;
  renderLayout();
});
waveHeight.value = String(defaultWaveSettings.maxHeight);
waveDensity.value = String(defaultWaveSettings.density);
waveDirection.value = defaultWaveSettings.direction;
for (const [id, label] of Object.entries(archRoutes)) {
  archRoute.add(new Option(label, id));
}
archRoute.addEventListener('change', renderLayout);
archRotation.addEventListener('change', renderLayout);
archShiftX.addEventListener('input', renderLayout);
archShiftY.addEventListener('input', renderLayout);
patternInput.addEventListener('change', renderLayout);
grooves.addEventListener('change', renderLayout);
waveHeight.addEventListener('input', renderLayout);
waveDensity.addEventListener('input', renderLayout);
waveDirection.addEventListener('change', renderLayout);
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
