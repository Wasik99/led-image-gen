import createManifold from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';

const engine = await createManifold({ locateFile: () => wasmUrl });
engine.setup();

export interface SolidCircle {
  x: number;
  y: number;
  radius: number;
  height: number;
}

function toSolid(vertices: Float32Array) {
  const lookup = new Map<string, number>();
  const positions: number[] = [];
  const triangles = new Uint32Array(vertices.length / 3);
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
    const key = `${x},${y},${z}`;
    let index = lookup.get(key);
    if (index === undefined) {
      index = positions.length / 3;
      positions.push(x, y, z);
      lookup.set(key, index);
    }
    triangles[i / 3] = index;
  }

  return new engine.Manifold(new engine.Mesh({
    numProp: 3, vertProperties: new Float32Array(positions), triVerts: triangles,
  }));
}

export function applySolidCircles(
  base: Float32Array, side: number, referenceHeight: number, circles: SolidCircle[], inverted: boolean,
) {
  const body = toSolid(base);
  const clip = engine.Manifold.cube([side, side, referenceHeight + Math.max(...circles.map(circle => circle.height)) + 1]);
  const inserts = circles.map(({ x, y, radius, height }) => {
    // Extend across the reference surface for both joining and cutting.
    const cylinder = engine.Manifold.cylinder(height + 1, radius, radius, 192);
    const positioned = cylinder.translate([x, y, inverted ? referenceHeight - height : referenceHeight - 1]);
    const clipped = positioned.intersect(clip);
    cylinder.delete();
    positioned.delete();
    return clipped;
  });
  const merged = inverted
    ? engine.Manifold.difference([body, ...inserts])
    : engine.Manifold.union([body, ...inserts]);
  try {
    const shaded = merged.calculateNormals(0, 35);
    try {
      const mesh = shaded.getMesh();
      const vertices = new Float32Array(mesh.triVerts.length * 3);
      const normals = new Float32Array(vertices.length);
      const outline: number[] = [];
      for (let i = 0; i < mesh.triVerts.length; i++) {
        const start = mesh.triVerts[i] * mesh.numProp;
        vertices.set(mesh.vertProperties.subarray(start, start + 3), i * 3);
        normals.set(mesh.vertProperties.subarray(start + 3, start + 6), i * 3);
      }
      for (let i = 0; i < vertices.length; i += 9) {
        const ax = vertices[i + 3] - vertices[i];
        const ay = vertices[i + 4] - vertices[i + 1];
        const bx = vertices[i + 6] - vertices[i];
        const by = vertices[i + 7] - vertices[i + 1];
        if (ax * by - ay * bx <= 0) continue;
        for (let j = 0; j < 3; j++) {
          const a = i + 3 * j;
          const b = i + 3 * ((j + 1) % 3);
          const onBorder = [0, 1].some(axis => [0, side].some(edge =>
            Math.abs(vertices[a + axis] - edge) < 1e-5 && Math.abs(vertices[b + axis] - edge) < 1e-5,
          ));
          if (onBorder) outline.push(
            vertices[a], vertices[a + 1], vertices[a + 2] + 0.05,
            vertices[b], vertices[b + 1], vertices[b + 2] + 0.05,
          );
        }
      }
      return { vertices, normals, outline: new Float32Array(outline) };
    } finally {
      shaded.delete();
    }
  } finally {
    merged.delete();
    inserts.forEach(insert => insert.delete());
    clip.delete();
    body.delete();
  }
}
