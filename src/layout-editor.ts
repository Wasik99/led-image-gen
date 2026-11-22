import { boardScale, circleRadius, connectedPieces, defaultPieceHeight, pieceHitWidth, railPath, railPaths, snapPiece, type BoardPoint, type LayoutPiece, type PieceDimensions, type PieceKind } from './custom-layout';

const svgNamespace = 'http://www.w3.org/2000/svg';
const pieceLimit = 24;
const boardPadding = 3;

interface DragState {
  pointerId: number;
  offset: BoardPoint;
  dimensions: PieceDimensions;
  group: { piece: LayoutPiece; origin: BoardPoint }[];
  minDelta: BoardPoint;
  maxDelta: BoardPoint;
}

export function createLayoutEditor(panel: HTMLElement, onChange: () => void) {
  const board = panel.querySelector<SVGSVGElement>('svg')!;
  const boundary = board.querySelector<SVGRectElement>('rect')!;
  const moveConnected = panel.querySelector<HTMLInputElement>('#move-connected')!;
  const drawing = board.querySelector<SVGGElement>('g')!;
  const marker = board.querySelector<SVGCircleElement>('circle')!;
  const rotate = panel.querySelector<HTMLButtonElement>('#rotate-piece')!;
  const remove = panel.querySelector<HTMLButtonElement>('#remove-piece')!;
  const size = panel.querySelector<HTMLInputElement>('#piece-size')!;
  const reliefHeight = panel.querySelector<HTMLInputElement>('#piece-relief-height')!;
  const railCount = panel.querySelector<HTMLInputElement>('#piece-rail-count')!;
  const groupSize = panel.querySelector<HTMLElement>('#piece-group-size')!;
  const palette = [...panel.querySelectorAll<HTMLButtonElement>('[data-piece-kind]')];
  const pieces: LayoutPiece[] = [];
  let width = 100;
  let height = 100;
  let nextId = 0;
  let selected: LayoutPiece | undefined;
  let joint: BoardPoint | undefined;
  let dragging: DragState | undefined;

  function render() {
    drawing.replaceChildren();
    const groupPieces = selected ? connectedPieces(selected, pieces) : [];
    const connected = new Set(groupPieces);
    for (const piece of pieces) {
      const group = document.createElementNS(svgNamespace, 'g');
      group.dataset.piece = String(piece.id);
      group.classList.toggle('selected', piece === selected);
      group.classList.toggle('connected', connected.has(piece));
      group.setAttribute('transform', `translate(${piece.x} ${piece.y}) rotate(${piece.rotation * 90}) scale(${piece.size})`);
      if (piece.kind === 'circle') {
        const disc = document.createElementNS(svgNamespace, 'circle');
        disc.classList.add('piece-disc');
        disc.setAttribute('r', String(circleRadius));
        group.append(disc);
      } else {
        const hitArea = document.createElementNS(svgNamespace, 'path');
        hitArea.classList.add('piece-hit-area');
        hitArea.setAttribute('d', railPath(piece.kind));
        hitArea.setAttribute('stroke-width', String(pieceHitWidth(piece.railCount)));
        group.append(hitArea);
        for (const path of railPaths(piece)) {
          const rail = document.createElementNS(svgNamespace, 'path');
          rail.classList.add('piece-rail');
          rail.setAttribute('d', path);
          group.append(rail);
        }
      }
      drawing.append(group);
    }
    marker.style.display = joint ? '' : 'none';
    if (joint) {
      marker.setAttribute('cx', String(joint.x));
      marker.setAttribute('cy', String(joint.y));
    }
    remove.disabled = size.disabled = reliefHeight.disabled = !selected;
    railCount.disabled = rotate.disabled = !selected || selected.kind === 'circle';
    size.value = selected ? String(Math.round(selected.size * 100)) : '';
    reliefHeight.value = selected ? String(selected.reliefHeight) : '';
    railCount.value = selected && !railCount.disabled ? String(selected.railCount) : '';
    groupSize.textContent = groupPieces.length > 1 ? `Elementy w połączonej grupie: ${groupPieces.length}` : '';
    for (const button of palette) button.disabled = pieces.length >= pieceLimit;
  }

  function boardPoint(event: MouseEvent): BoardPoint {
    const matrix = board.getScreenCTM()!;
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  }

  function move(piece: LayoutPiece, point: BoardPoint) {
    piece.x = Math.max(0, Math.min(width, point.x));
    piece.y = Math.max(0, Math.min(height, point.y));
    const snap = snapPiece(piece, pieces, width, height);
    joint = snap?.joint;
    if (snap) Object.assign(piece, snap.point, snap.dimensions);
    render();
    onChange();
  }

  function add(kind: PieceKind, point: BoardPoint) {
    if (pieces.length >= pieceLimit) return;
    selected = { id: nextId++, kind, rotation: 0, size: 1, railCount: 5, reliefHeight: defaultPieceHeight, ...point };
    pieces.push(selected);
    move(selected, point);
  }

  for (const button of palette) {
    const kind = button.dataset.pieceKind as PieceKind;
    button.addEventListener('click', () => {
      const offset = (pieces.length % 5) * 4;
      add(kind, { x: width / 2 + offset, y: height / 2 + offset });
    });
    button.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('application/x-led-piece', kind);
    });
  }

  board.addEventListener('dragover', (event) => {
    if (event.dataTransfer?.types.includes('application/x-led-piece')) event.preventDefault();
  });
  board.addEventListener('drop', (event) => {
    const kind = event.dataTransfer?.getData('application/x-led-piece');
    if (kind !== 'straight' && kind !== 'corner' && kind !== 'circle') return;
    event.preventDefault();
    add(kind, boardPoint(event));
  });

  board.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const target = (event.target as Element).closest<SVGGElement>('[data-piece]');
    selected = pieces.find(piece => String(piece.id) === target?.dataset.piece);
    joint = undefined;
    if (selected) {
      const point = boardPoint(event);
      const group = (moveConnected.checked ? connectedPieces(selected, pieces) : [selected])
        .map(piece => ({ piece, origin: { x: piece.x, y: piece.y } }));
      dragging = {
        pointerId: event.pointerId,
        offset: { x: point.x - selected.x, y: point.y - selected.y },
        dimensions: { size: selected.size, railCount: selected.railCount, reliefHeight: selected.reliefHeight },
        group,
        minDelta: {
          x: Math.min(0, -Math.min(...group.map(({ origin }) => origin.x))),
          y: Math.min(0, -Math.min(...group.map(({ origin }) => origin.y))),
        },
        maxDelta: {
          x: Math.max(0, width - Math.max(...group.map(({ origin }) => origin.x))),
          y: Math.max(0, height - Math.max(...group.map(({ origin }) => origin.y))),
        },
      };
      board.setPointerCapture(event.pointerId);
    }
    render();
  });
  board.addEventListener('pointermove', (event) => {
    if (!selected || dragging?.pointerId !== event.pointerId) return;
    const point = boardPoint(event);
    const destination = { x: point.x - dragging.offset.x, y: point.y - dragging.offset.y };
    if (dragging.group.length === 1) {
      Object.assign(selected, dragging.dimensions);
      move(selected, destination);
      return;
    }

    const anchor = dragging.group[0].origin;
    const dx = Math.max(dragging.minDelta.x, Math.min(dragging.maxDelta.x, destination.x - anchor.x));
    const dy = Math.max(dragging.minDelta.y, Math.min(dragging.maxDelta.y, destination.y - anchor.y));
    for (const { piece, origin } of dragging.group) {
      piece.x = origin.x + dx;
      piece.y = origin.y + dy;
    }
    render();
    onChange();
  });
  board.addEventListener('lostpointercapture', (event) => {
    if (dragging?.pointerId === event.pointerId) dragging = undefined;
  });

  function updateDimensions() {
    if (!selected) return;
    if (!size.checkValidity() || !railCount.checkValidity() || !reliefHeight.checkValidity()) {
      render();
      return;
    }
    const newSize = size.valueAsNumber / 100;
    const newRailCount = railCount.disabled ? selected.railCount : railCount.valueAsNumber;
    const group = connectedPieces(selected, pieces);
    const factor = newSize / selected.size;
    const anchor = { x: selected.x, y: selected.y };
    for (const piece of group) {
      piece.x = anchor.x + (piece.x - anchor.x) * factor;
      piece.y = anchor.y + (piece.y - anchor.y) * factor;
      piece.size = newSize;
      piece.railCount = newRailCount;
      piece.reliefHeight = reliefHeight.valueAsNumber;
    }
    joint = undefined;
    render();
    onChange();
  }

  size.addEventListener('change', updateDimensions);
  railCount.addEventListener('change', updateDimensions);
  reliefHeight.addEventListener('change', updateDimensions);

  rotate.addEventListener('click', () => {
    if (!selected) return;
    selected.rotation = (selected.rotation + 1) % 4;
    move(selected, selected);
  });
  remove.addEventListener('click', () => {
    if (!selected) return;
    pieces.splice(pieces.indexOf(selected), 1);
    selected = undefined;
    joint = undefined;
    render();
    onChange();
  });

  function setSize(imageWidth: number, imageHeight: number) {
    const scale = boardScale(imageWidth, imageHeight);
    const nextWidth = imageWidth / scale;
    const nextHeight = imageHeight / scale;
    if (width === nextWidth && height === nextHeight) return;
    joint = undefined;
    width = nextWidth;
    height = nextHeight;
    const paddedWidth = width + 2 * boardPadding;
    const paddedHeight = height + 2 * boardPadding;
    board.setAttribute('viewBox', `${-boardPadding} ${-boardPadding} ${paddedWidth} ${paddedHeight}`);
    board.style.aspectRatio = `${paddedWidth} / ${paddedHeight}`;
    boundary.setAttribute('width', String(width));
    boundary.setAttribute('height', String(height));
    render();
  }

  render();
  return { pieces, setSize };
}
