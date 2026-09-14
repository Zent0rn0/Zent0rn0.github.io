// Sparse dual contouring over a signed distance function.
// Only blocks of 8³ cells near the surface are sampled. Every active cell gets one vertex placed by
// minimising the quadric error of the tangent planes at its sign-changing edges, which keeps plate
// edges and corners sharp; every sign-changing edge becomes a quad.
const B = 8;
const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];

// eigen decomposition of a symmetric 3×3 matrix (cyclic Jacobi); returns values in w, vectors as columns of v
function eigen3(a, w, v) {
  const m = [[a[0], a[1], a[2]], [a[1], a[3], a[4]], [a[2], a[4], a[5]]];
  const V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 8; sweep++) {
    const off = Math.abs(m[0][1]) + Math.abs(m[0][2]) + Math.abs(m[1][2]);
    if (off < 1e-12) break;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
      if (Math.abs(m[p][q]) < 1e-14) continue;
      const theta = (m[q][q] - m[p][p]) / (2 * m[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < 3; k++) { const mkp = m[k][p], mkq = m[k][q]; m[k][p] = c * mkp - s * mkq; m[k][q] = s * mkp + c * mkq; }
      for (let k = 0; k < 3; k++) { const mpk = m[p][k], mqk = m[q][k]; m[p][k] = c * mpk - s * mqk; m[q][k] = s * mpk + c * mqk; }
      for (let k = 0; k < 3; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  for (let i = 0; i < 3; i++) { w[i] = m[i][i]; for (let k = 0; k < 3; k++) v[k * 3 + i] = V[k][i]; }
}

export function meshSDF({ sdf, material, lo, hi, h }) {
  const nx = Math.ceil((hi[0] - lo[0]) / h), ny = Math.ceil((hi[1] - lo[1]) / h), nz = Math.ceil((hi[2] - lo[2]) / h);
  const bx = Math.ceil(nx / B), by = Math.ceil(ny / B), bz = Math.ceil(nz / B);
  const at = (i, j, k) => sdf(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);

  // coarse pass: blocks that can contain surface
  const coarse = new Float32Array((bx + 1) * (by + 1) * (bz + 1));
  const ci = (i, j, k) => i + (bx + 1) * (j + (by + 1) * k);
  for (let k = 0; k <= bz; k++) for (let j = 0; j <= by; j++) for (let i = 0; i <= bx; i++) coarse[ci(i, j, k)] = at(i * B, j * B, k * B);
  const band = 1.7 * Math.sqrt(3) * B * h;
  const active = [];
  for (let k = 0; k < bz; k++) for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
    let nearest = Infinity, neg = false, pos = false;
    for (let c = 0; c < 8; c++) {
      const v = coarse[ci(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))];
      nearest = Math.min(nearest, Math.abs(v)); if (v < 0) neg = true; else pos = true;
    }
    if (nearest < band || (neg && pos)) active.push([i, j, k]);
  }

  const blocks = new Map();
  const block = (i, j, k) => {
    const key = i + bx * (j + by * k);
    let b = blocks.get(key);
    if (!b) {
      const vals = new Float32Array(729);
      for (let c = 0; c < 9; c++) for (let bb = 0; bb < 9; bb++) for (let a = 0; a < 9; a++) vals[a + 9 * (bb + 9 * c)] = at(i * B + a, j * B + bb, k * B + c);
      b = { vals, verts: new Int32Array(512).fill(-2) };
      blocks.set(key, b);
    }
    return b;
  };

  const pos = [], mat = [];
  const e = h * 0.25, g = [0, 0, 0], corner = new Float32Array(8), ata = new Float64Array(6), w = [0, 0, 0], v = new Float64Array(9);
  // tetrahedral gradient: four samples
  const gradient = (x, y, z) => {
    const a = sdf(x + e, y - e, z - e), b = sdf(x - e, y - e, z + e), c = sdf(x - e, y + e, z - e), d = sdf(x + e, y + e, z + e);
    g[0] = a - b - c + d; g[1] = -a - b + c + d; g[2] = -a + b - c + d;
    const l = Math.hypot(g[0], g[1], g[2]) || 1;
    g[0] /= l; g[1] /= l; g[2] /= l;
  };

  const vertex = (i, j, k) => {
    if (i < 0 || j < 0 || k < 0 || i >= bx * B || j >= by * B || k >= bz * B) return -1;
    const bi = i >> 3, bj = j >> 3, bk = k >> 3, b = block(bi, bj, bk);
    const li = i - bi * B, lj = j - bj * B, lk = k - bk * B, cell = li + 8 * (lj + 8 * lk);
    if (b.verts[cell] !== -2) return b.verts[cell];
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      corner[c] = b.vals[li + (c & 1) + 9 * (lj + ((c >> 1) & 1) + 9 * (lk + ((c >> 2) & 1)))];
      if (corner[c] < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) return (b.verts[cell] = -1);

    const x0 = lo[0] + i * h, y0 = lo[1] + j * h, z0 = lo[2] + k * h;
    ata.fill(0);
    let rx = 0, ry = 0, rz = 0, mx = 0, my = 0, mz = 0, n = 0;
    for (const [ea, ec] of EDGES) {
      const va = corner[ea], vc = corner[ec];
      if ((va < 0) === (vc < 0)) continue;
      const t = va / (va - vc);
      const px = x0 + h * ((ea & 1) + t * ((ec & 1) - (ea & 1)));
      const py = y0 + h * (((ea >> 1) & 1) + t * (((ec >> 1) & 1) - ((ea >> 1) & 1)));
      const pz = z0 + h * (((ea >> 2) & 1) + t * (((ec >> 2) & 1) - ((ea >> 2) & 1)));
      gradient(px, py, pz);
      const d = g[0] * px + g[1] * py + g[2] * pz;
      ata[0] += g[0] * g[0]; ata[1] += g[0] * g[1]; ata[2] += g[0] * g[2]; ata[3] += g[1] * g[1]; ata[4] += g[1] * g[2]; ata[5] += g[2] * g[2];
      rx += g[0] * d; ry += g[1] * d; rz += g[2] * d;
      mx += px; my += py; mz += pz; n++;
    }
    mx /= n; my /= n; mz /= n;
    // solve AᵀA (x - m) = Aᵀb - AᵀA m with a truncated pseudo-inverse
    const qx = rx - (ata[0] * mx + ata[1] * my + ata[2] * mz);
    const qy = ry - (ata[1] * mx + ata[3] * my + ata[4] * mz);
    const qz = rz - (ata[2] * mx + ata[4] * my + ata[5] * mz);
    eigen3(ata, w, v);
    const top = Math.max(Math.abs(w[0]), Math.abs(w[1]), Math.abs(w[2]));
    let x = mx, y = my, z = mz;
    for (let c = 0; c < 3; c++) {
      if (Math.abs(w[c]) < top * 0.1) continue;
      const vx = v[c], vy = v[3 + c], vz = v[6 + c];
      const s = (vx * qx + vy * qy + vz * qz) / w[c];
      x += vx * s; y += vy * s; z += vz * s;
    }
    const pad = h * 0.3;
    if (x < x0 - pad || x > x0 + h + pad || y < y0 - pad || y > y0 + h + pad || z < z0 - pad || z > z0 + h + pad) { x = mx; y = my; z = mz; }
    sdf(x, y, z);
    pos.push(x, y, z); mat.push(material());
    return (b.verts[cell] = pos.length / 3 - 1);
  };

  const tris = [];
  const quad = (a, b, c, d) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    const dist = (p, q) => Math.hypot(pos[p * 3] - pos[q * 3], pos[p * 3 + 1] - pos[q * 3 + 1], pos[p * 3 + 2] - pos[q * 3 + 2]);
    if (dist(a, c) < dist(b, d)) tris.push(a, b, c, a, c, d); else tris.push(a, b, d, b, c, d);
  };

  for (const [bi, bj, bk] of active) {
    const b = block(bi, bj, bk);
    for (let lk = 0; lk < 8; lk++) for (let lj = 0; lj < 8; lj++) for (let li = 0; li < 8; li++) {
      const inside = b.vals[li + 9 * (lj + 9 * lk)] < 0;
      const i = bi * B + li, j = bj * B + lj, k = bk * B + lk;
      if (inside !== b.vals[li + 1 + 9 * (lj + 9 * lk)] < 0) {
        const q = [vertex(i, j - 1, k - 1), vertex(i, j, k - 1), vertex(i, j, k), vertex(i, j - 1, k)];
        inside ? quad(q[0], q[1], q[2], q[3]) : quad(q[3], q[2], q[1], q[0]);
      }
      if (inside !== b.vals[li + 9 * (lj + 1 + 9 * lk)] < 0) {
        const q = [vertex(i - 1, j, k - 1), vertex(i - 1, j, k), vertex(i, j, k), vertex(i, j, k - 1)];
        inside ? quad(q[0], q[1], q[2], q[3]) : quad(q[3], q[2], q[1], q[0]);
      }
      if (inside !== b.vals[li + 9 * (lj + 9 * (lk + 1))] < 0) {
        const q = [vertex(i - 1, j - 1, k), vertex(i, j - 1, k), vertex(i, j, k), vertex(i - 1, j, k)];
        inside ? quad(q[0], q[1], q[2], q[3]) : quad(q[3], q[2], q[1], q[0]);
      }
    }
  }

  return { positions: new Float32Array(pos), materials: Uint8Array.from(mat), indices: Uint32Array.from(tris), stats: { blocks: blocks.size, vertices: pos.length / 3, triangles: tris.length / 3 } };
}

// Vertex normals that stay smooth across gentle curvature but split at plate edges.
export function creasedNormals(positions, indices, creaseDeg = 34) {
  const faces = indices.length / 3, fn = new Float32Array(faces * 3);
  const incident = Array.from({ length: positions.length / 3 }, () => []);
  for (let f = 0; f < faces; f++) {
    const [a, b, c] = [indices[f * 3], indices[f * 3 + 1], indices[f * 3 + 2]];
    const ux = positions[b * 3] - positions[a * 3], uy = positions[b * 3 + 1] - positions[a * 3 + 1], uz = positions[b * 3 + 2] - positions[a * 3 + 2];
    const vx = positions[c * 3] - positions[a * 3], vy = positions[c * 3 + 1] - positions[a * 3 + 1], vz = positions[c * 3 + 2] - positions[a * 3 + 2];
    // area-weighted normal (length = 2 × area)
    fn[f * 3] = uy * vz - uz * vy; fn[f * 3 + 1] = uz * vx - ux * vz; fn[f * 3 + 2] = ux * vy - uy * vx;
    incident[a].push(f); incident[b].push(f); incident[c].push(f);
  }
  const cos = Math.cos((creaseDeg * Math.PI) / 180);
  const unit = f => { const l = Math.hypot(fn[f * 3], fn[f * 3 + 1], fn[f * 3 + 2]) || 1; return [fn[f * 3] / l, fn[f * 3 + 1] / l, fn[f * 3 + 2] / l]; };
  const outPos = [], outNor = [], outIdx = new Uint32Array(indices.length), keys = new Map();
  for (let f = 0; f < faces; f++) {
    const nf = unit(f);
    for (let corner = 0; corner < 3; corner++) {
      const vtx = indices[f * 3 + corner];
      let sx = 0, sy = 0, sz = 0;
      for (const other of incident[vtx]) {
        const no = unit(other);
        if (nf[0] * no[0] + nf[1] * no[1] + nf[2] * no[2] < cos) continue;
        sx += fn[other * 3]; sy += fn[other * 3 + 1]; sz += fn[other * 3 + 2];
      }
      const l = Math.hypot(sx, sy, sz) || 1;
      sx /= l; sy /= l; sz /= l;
      const key = `${vtx}:${Math.round(sx * 64)},${Math.round(sy * 64)},${Math.round(sz * 64)}`;
      let id = keys.get(key);
      if (id === undefined) {
        id = outPos.length / 3; keys.set(key, id);
        outPos.push(positions[vtx * 3], positions[vtx * 3 + 1], positions[vtx * 3 + 2]); outNor.push(sx, sy, sz);
      }
      outIdx[f * 3 + corner] = id;
    }
  }
  return { positions: new Float32Array(outPos), normals: new Float32Array(outNor), indices: outIdx };
}
