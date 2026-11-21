import { boardScale, pieceHitWidth, railPath, railPaths, snapPiece, type BoardPoint, type LayoutPiece, type PieceKind } from './custom-layout';

const svgNamespace = 'http://www.w3.org/2000/svg';
const pieceLimit = 24;

export function createLayoutEditor(panel: HTMLElement, onChange: () => void) {
  const board = panel.querySelector<SVGSVGElement>('svg')!;
  const drawing = board.querySelector<SVGGElement>('g')!;
  const marker = board.querySelector<SVGCircleElement>('circle')!;
  const rotate = panel.querySelector<HTMLButtonElement>('#rotate-piece')!;
  const remove = panel.querySelector<HTMLButtonElement>('#remove-piece')!;
  const palette = [...panel.querySelectorAll<HTMLButtonElement>('[data-piece-kind]')];
  const pieces: LayoutPiece[] = [];
  let width = 100;
  let height = 100;
  let nextId = 0;
  let selected: LayoutPiece | undefined;
  let joint: BoardPoint | undefined;
  let dragging: { pointerId: number; offset: BoardPoint } | undefined;

  function render() {
    drawing.replaceChildren();
    for (const piece of pieces) {
      const group = document.createElementNS(svgNamespace, 'g');
      group.dataset.piece = String(piece.id);
      group.classList.toggle('selected', piece === selected);
      group.setAttribute('transform', `translate(${piece.x} ${piece.y}) rotate(${piece.rotation * 90})`);
      const hitArea = document.createElementNS(svgNamespace, 'path');
      hitArea.classList.add('piece-hit-area');
      hitArea.setAttribute('d', railPath(piece.kind));
      hitArea.setAttribute('stroke-width', String(pieceHitWidth));
      group.append(hitArea);
      for (const path of railPaths(piece.kind)) {
        const rail = document.createElementNS(svgNamespace, 'path');
        rail.classList.add('piece-rail');
        rail.setAttribute('d', path);
        group.append(rail);
      }
      drawing.append(group);
    }
    marker.style.display = joint ? '' : 'none';
    if (joint) {
      marker.setAttribute('cx', String(joint.x));
      marker.setAttribute('cy', String(joint.y));
    }
    rotate.disabled = remove.disabled = !selected;
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
    if (snap) Object.assign(piece, snap.point);
    render();
    onChange();
  }

  function add(kind: PieceKind, point: BoardPoint) {
    if (pieces.length >= pieceLimit) return;
    selected = { id: nextId++, kind, rotation: 0, ...point };
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
    if (kind !== 'straight' && kind !== 'corner') return;
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
      dragging = { pointerId: event.pointerId, offset: { x: point.x - selected.x, y: point.y - selected.y } };
      board.setPointerCapture(event.pointerId);
    }
    render();
  });
  board.addEventListener('pointermove', (event) => {
    if (!selected || dragging?.pointerId !== event.pointerId) return;
    const point = boardPoint(event);
    move(selected, { x: point.x - dragging.offset.x, y: point.y - dragging.offset.y });
  });
  board.addEventListener('lostpointercapture', (event) => {
    if (dragging?.pointerId === event.pointerId) dragging = undefined;
  });

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
    if (width !== nextWidth || height !== nextHeight) joint = undefined;
    width = nextWidth;
    height = nextHeight;
    board.setAttribute('viewBox', `0 0 ${width} ${height}`);
    board.style.aspectRatio = `${width} / ${height}`;
    render();
  }

  render();
  return { pieces, setSize };
}
