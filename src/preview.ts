import {
  AmbientLight, BufferAttribute, BufferGeometry, Color, DirectionalLight, Group, LineBasicMaterial, LineLoop, Mesh,
  MeshStandardMaterial, PerspectiveCamera, Scene, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BASE_HEIGHT, type Tile } from './geometry';

export function createPreview(viewport: HTMLElement) {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  viewport.append(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color('#202426');
  const art = new Group();
  scene.add(art, new AmbientLight('#e4e9ed', 1.35));

  const key = new DirectionalLight('#fff0db', 2.8);
  key.position.set(-2, 3, 2.5);
  scene.add(key);
  const fill = new DirectionalLight('#a7c9e4', 0.65);
  fill.position.set(2, -2, 1);
  scene.add(fill);

  const camera = new PerspectiveCamera(40, 1, 1, 16000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI - 0.05;
  controls.addEventListener('change', render);

  function render() {
    renderer.render(scene, camera);
  }

  const resize = new ResizeObserver(() => {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.zoom = Math.min(1, camera.aspect);
    camera.updateProjectionMatrix();
    render();
  });
  resize.observe(viewport);

  const material = new MeshStandardMaterial({ color: '#c2b29d', roughness: 0.86 });
  const outlineHeight = BASE_HEIGHT + 0.05;
  const outlineMaterial = new LineBasicMaterial({ color: '#786b5b' });
  const meshes: Mesh[] = [];
  let outline: BufferGeometry | undefined;

  return function showTiles(tiles: Tile[], width: number, height: number, side: number) {
    for (const mesh of meshes) {
      art.remove(mesh);
      mesh.geometry.dispose();
    }
    meshes.length = 0;
    outline?.dispose();
    outline = undefined;
    if (!tiles.length) {
      render();
      return;
    }

    outline = new BufferGeometry().setFromPoints([
      new Vector3(0, 0, outlineHeight),
      new Vector3(side, 0, outlineHeight),
      new Vector3(side, side, outlineHeight),
      new Vector3(0, side, outlineHeight),
    ]);

    for (const tile of tiles) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(tile.vertices, 3));
      geometry.computeVertexNormals();
      const mesh = new Mesh(geometry, material);
      mesh.position.set(tile.column * side - width / 2, height / 2 - (tile.row + 1) * side, 0);
      mesh.add(new LineLoop(outline, outlineMaterial));
      meshes.push(mesh);
      art.add(mesh);
    }

    const span = Math.max(width, height, width * 1.35);
    camera.position.set(span * 0.38, -span * 0.32, span * 1.62);
    controls.minDistance = span * 0.45;
    controls.maxDistance = span * 4;
    controls.update();
    render();
  };
}
