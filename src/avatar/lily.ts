import { BufferGeometry, CylinderGeometry, Float32BufferAttribute, SphereGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// A lily around +y at unit scale (matches the anchor scale baked into the model):
// six slender petals that open, curl back towards the tips and carry a channel down the middle.
export function lilyPetals(): BufferGeometry {
  const position: number[] = [], index: number[] = [];
  const length = 0.16, width = 0.034, along = 12, across = 4;
  for (let p = 0; p < 6; p++) {
    const azimuth = (p * Math.PI) / 3 + (p % 2) * 0.12;
    const open = p % 2 ? 0.42 : 0.58;
    const ca = Math.cos(azimuth), sa = Math.sin(azimuth);
    const base = position.length / 3;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i <= along; i++) {
      const t = i / along;
      const tilt = open + 1.25 * t * t * t;
      if (i > 0) { const step = length / along; cx += Math.sin(tilt) * ca * step; cy += Math.cos(tilt) * step; cz += Math.sin(tilt) * sa * step; }
      const nx = Math.cos(tilt) * ca, ny = -Math.sin(tilt), nz = Math.cos(tilt) * sa;
      const w = width * Math.pow(Math.sin(Math.PI * Math.min(t * 1.08 + 0.02, 1)), 0.75);
      for (let j = 0; j <= across; j++) {
        const u = (j / across) * 2 - 1, channel = Math.abs(u) * w * 0.45;
        position.push(cx - sa * u * w + nx * channel, cy + ny * channel, cz + ca * u * w + nz * channel);
      }
    }
    for (let i = 0; i < along; i++) for (let j = 0; j < across; j++) {
      const a = base + i * (across + 1) + j, b = a + 1, c = a + across + 1, d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export function lilyStamens(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + 0.3, lean = 0.26;
    const filament = new CylinderGeometry(0.0028, 0.0035, 0.11, 5, 1, true).translate(0, 0.055, 0).rotateX(Math.sin(a) * lean).rotateZ(-Math.cos(a) * lean);
    const tip = new SphereGeometry(0.008, 8, 6).translate(0, 0.11, 0).rotateX(Math.sin(a) * lean).rotateZ(-Math.cos(a) * lean);
    parts.push(filament.toNonIndexed(), tip.toNonIndexed());
  }
  parts.forEach(g => { g.deleteAttribute('uv'); });
  return mergeGeometries(parts);
}
