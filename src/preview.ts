import {
  ACESFilmicToneMapping, BufferAttribute, BufferGeometry, Color, DirectionalLight, Group, HemisphereLight,
  LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, PCFShadowMap, PerspectiveCamera, PlaneGeometry,
  PMREMGenerator, Scene, ShadowMaterial, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Tile } from './geometry';

export function createPreview(viewport: HTMLElement) {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  viewport.append(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color('#202426');
  const environment = new RoomEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environment, 0.04).texture;
  scene.environmentIntensity = 0.38;
  environment.dispose();
  pmrem.dispose();

  const art = new Group();
  const outlines = new Group();
  scene.add(art, outlines, new HemisphereLight('#eef1f4', '#ad8a73', 0.48));

  const key = new DirectionalLight('#fff1dc', 3.1);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0001;
  scene.add(key);
  const fill = new DirectionalLight('#c0d8ef', 0.55);
  fill.position.set(2, -2, 1);
  scene.add(fill);

  const backdrop = new Mesh(new PlaneGeometry(1, 1), new ShadowMaterial({ opacity: 0.28 }));
  backdrop.position.z = -1.2;
  backdrop.receiveShadow = true;
  backdrop.visible = false;
  scene.add(backdrop);

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

  const material = new MeshStandardMaterial({ color: '#c8ac8b', roughness: 0.56 });
  const outlineMaterial = new LineBasicMaterial({ color: '#786b5b' });
  const geometries: BufferGeometry[] = [];

  function showTiles(tiles: Tile[], width: number, height: number, side: number) {
    art.clear();
    outlines.clear();
    for (const geometry of geometries) geometry.dispose();
    geometries.length = 0;
    backdrop.visible = tiles.length > 0;
    if (!tiles.length) {
      render();
      return;
    }

    for (const tile of tiles) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(tile.vertices, 3));
      if (tile.normals) {
        geometry.setAttribute('normal', new BufferAttribute(tile.normals, 3));
      } else {
        geometry.computeVertexNormals();
      }
      const mesh = new Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.position.set(tile.column * side - width / 2, height / 2 - (tile.row + 1) * side, 0);
      const outline = new BufferGeometry();
      outline.setAttribute('position', new BufferAttribute(tile.outline, 3));
      const lines = new LineSegments(outline, outlineMaterial);
      lines.position.copy(mesh.position);
      outlines.add(lines);
      geometries.push(geometry, outline);
      art.add(mesh);
    }

    const shadowRadius = Math.hypot(width, height) / 2 + 55;
    key.position.set(-shadowRadius * 1.2, shadowRadius, shadowRadius * 1.15);
    const shadowCamera = key.shadow.camera;
    shadowCamera.left = shadowCamera.bottom = -shadowRadius;
    shadowCamera.right = shadowCamera.top = shadowRadius;
    shadowCamera.near = 1;
    shadowCamera.far = shadowRadius * 4;
    shadowCamera.updateProjectionMatrix();
    key.shadow.normalBias = 0.12 + shadowRadius / 2048;
    backdrop.scale.set(shadowRadius * 5, shadowRadius * 5, 1);
    // The light and model stay fixed during orbiting, so one shadow render per edit is enough.
    renderer.shadowMap.needsUpdate = true;

    const span = Math.max(width, height, width * 1.35);
    camera.position.set(span * 0.42, -span * 0.65, span * 1.53);
    controls.minDistance = span * 0.45;
    controls.maxDistance = span * 4;
    controls.update();
    render();
  }

  function setOutlinesVisible(visible: boolean) {
    outlines.visible = visible;
    render();
  }

  return { showTiles, setOutlinesVisible };
}
