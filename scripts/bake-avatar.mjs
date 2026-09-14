// Bakes the procedural knight into public/models/knight.glb:
// signed distance parts -> sparse surface nets -> per-material split -> meshoptimizer simplification
// -> glTF with anchor nodes for the glowing runtime parts -> quantization + meshopt compression.
// Run with `npm run avatar:bake` (add --preview for a quick, coarse bake).
import { mkdir, writeFile } from 'node:fs/promises';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { Quaternion, Vector3 } from 'three';
import { creasedNormals, meshSDF } from './avatar/mesher.mjs';
import * as knight from './avatar/model.mjs';

const preview = process.argv.includes('--preview');
const detail = preview ? 2.2 : 1;
const OUT = new URL('../public/models/knight.glb', import.meta.url);

const PARTS = [
  { name: 'body', sdf: knight.body, lo: [-1.0, knight.CROP_Y - 0.02, -0.6], hi: [1.0, 0.62, 0.95], h: 0.0045, error: 0.0016 },
  { name: 'cloak', sdf: knight.cloak, lo: [-1.4, knight.CROP_Y - 0.02, -1.42], hi: [1.4, 0.62, 0.72], h: 0.0075, error: 0.003, crease: 70 },
  { name: 'head', sdf: knight.head, lo: [-0.36, -0.16, -0.36], hi: [0.36, 1.03, 0.52], h: 0.0028, error: 0.0012, origin: knight.HEAD_PIVOT },
];
const MATERIAL_NAMES = Object.fromEntries(Object.entries(knight.MAT).map(([k, v]) => [v, k]));

await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready]);
const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('knight');
const root = doc.createNode('knight');
scene.addChild(root);
const materials = {};
const material = name => (materials[name] ??= doc.createMaterial(name).setMetallicFactor(1).setRoughnessFactor(0.35));

for (const part of PARTS) {
  const started = Date.now();
  // each part is meshed in its own frame; the head frame sits on the neck pivot so it can turn
  const mesh = meshSDF({ sdf: part.sdf, material: () => knight.out.mat, lo: part.lo, hi: part.hi, h: part.h * detail });

  const gltfMesh = doc.createMesh(part.name);
  const byMaterial = new Map();
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = [mesh.indices[t], mesh.indices[t + 1], mesh.indices[t + 2]];
    const m = mesh.materials[b] === mesh.materials[c] ? mesh.materials[b] : mesh.materials[a];
    if (!byMaterial.has(m)) byMaterial.set(m, []);
    byMaterial.get(m).push(a, b, c);
  }
  let kept = 0;
  for (const [m, list] of byMaterial) {
    const [simplified] = MeshoptSimplifier.simplify(Uint32Array.from(list), mesh.positions, 3, Math.floor(list.length * 0.012 / 3) * 3, part.error, ['LockBorder', 'ErrorAbsolute']);
    const remap = new Map(), p = [], idx = new Uint32Array(simplified.length);
    for (let i = 0; i < simplified.length; i++) {
      const v = simplified[i];
      if (!remap.has(v)) { remap.set(v, remap.size); p.push(mesh.positions[v * 3], mesh.positions[v * 3 + 1], mesh.positions[v * 3 + 2]); }
      idx[i] = remap.get(v);
    }
    const shaded = creasedNormals(new Float32Array(p), idx, part.crease ?? 34);
    kept += idx.length / 3;
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(shaded.positions).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(shaded.normals).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(shaded.indices).setBuffer(buffer))
      .setMaterial(material(MATERIAL_NAMES[m]));
    gltfMesh.addPrimitive(prim);
  }
  // the mesh lives on its own child node: quantization rewrites that node's transform, not the anchors'
  const node = doc.createNode(part.name).setTranslation(part.origin ?? [0, 0, 0]);
  node.addChild(doc.createNode(`${part.name}_mesh`).setMesh(gltfMesh));
  root.addChild(node);
  part.node = node;
  console.log(`${part.name}: ${mesh.stats.triangles} → ${kept} triangles, ${mesh.stats.blocks} blocks, ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

// anchors: empty nodes that tell the runtime where to build gems, lilies, the visor glow and the stem
const up = new Vector3(0, 1, 0);
const anchor = (parent, name, position, axis, scale = 1, from = up) => {
  const q = new Quaternion().setFromUnitVectors(from, new Vector3(...axis).normalize());
  parent.addChild(doc.createNode(name).setTranslation(position).setRotation([q.x, q.y, q.z, q.w]).setScale([scale, scale, scale]));
};
const a = knight.anchors();
const head = PARTS.find(p => p.name === 'head').node, body = PARTS.find(p => p.name === 'body').node;
a.head.gems.forEach((g, i) => anchor(head, `gem_${i}`, g.position, g.normal, g.size, new Vector3(1, 0, 0)));
a.head.lilies.forEach((l, i) => anchor(head, `lily_${i}`, l.position, l.axis, l.scale));
head.addChild(doc.createNode('visor').setTranslation(a.head.visor.position).setScale([a.head.visor.halfWidth, 1, a.head.visor.gap]));
const stem = a.body.stem;
body.addChild(doc.createNode('stem').setTranslation(stem.from).setScale([1, stem.to[1] - stem.from[1], 1]));
anchor(body, 'lily_held', a.body.lily.position, a.body.lily.axis, a.body.lily.scale);

await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: 14, quantizeNormal: 8 }));
await mkdir(new URL('.', OUT), { recursive: true });
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const bytes = await io.writeBinary(doc);
await writeFile(OUT, bytes);
console.log(`wrote ${OUT.pathname} (${(bytes.byteLength / 1024).toFixed(0)} KB)`);
