// Prepares a GLB from an image-to-3D service (Tripo, Meshy, …) for the site:
// dedup and weld vertices, simplify dense scans, drop the metal/roughness maps the site does not use,
// shrink textures to WebP, quantize and meshopt-compress.
// Usage: npm run avatar:import -- ~/Downloads/model.glb [public/models/knight.glb]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const [input, output = 'public/models/knight.glb'] = process.argv.slice(2);
if (!input) { console.error('usage: npm run avatar:import -- <model.glb> [output.glb]'); process.exit(1); }

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(input);
const triangles = () => doc.getRoot().listMeshes().flatMap(m => m.listPrimitives()).reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
const before = triangles();
// dense AI meshes: keep roughly 80k triangles (plenty at arch size), never simplify past a small geometric error
const ratio = Math.min(1, 80_000 / Math.max(before, 1));
// the stage renders imported models with flat metal/roughness values, so those maps are dead weight
for (const material of doc.getRoot().listMaterials()) material.setMetallicRoughnessTexture(null);

await doc.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.0008 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 84 }),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);
await io.write(output, doc);
const kb = f => stat(f).then(s => (s.size / 1024).toFixed(0));
console.log(`${input}: ${Math.round(before)} → ${Math.round(triangles())} triangles, ${await kb(input)} KB → ${await kb(output)} KB (${output})`);
