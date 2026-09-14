// The crowned knight as signed-distance parts. Units are roughly metres in the figure's own frame:
// y up, +z is where the breastplate faces.
import { P, R, box, capsule, clamp, ellipsoid, hash1, len2, len3, mod, octLen, polar, rect2, rot, roundBox, roundCone, smin } from './sdf.mjs';

const { abs, min, max, sqrt, cos, sin, atan2, PI } = Math;

export const MAT = { armor: 1, crown: 2, mail: 3, cloth: 4 };
export const out = { mat: MAT.armor };

export const CROP_Y = -1.95;
export const HEAD_PIVOT = [0, 0.3, 0.1];
const HS = 1.14;
const CROWN = { y: 0.1, rx: 0.238, rz: 0.282, r0: 0.25 };

// pose: both gauntlets close around the lily stem in front of the chest
const norm = v => { const l = len3(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
function limb(shoulder, elbow, grip, side) {
  const u = norm([elbow[0] - grip[0], 0, elbow[2] - grip[2]]);
  const wrist = [grip[0] + u[0] * 0.18, grip[1] - 0.03, grip[2] + u[2] * 0.18];
  const a1 = norm(elbow.map((v, i) => v - shoulder[i]));
  const a2 = norm(wrist.map((v, i) => v - elbow[i]));
  const o = norm(a1.map((v, i) => v - a2[i]));
  const n = norm([a1[1] * a2[2] - a1[2] * a2[1], a1[2] * a2[0] - a1[0] * a2[2], a1[0] * a2[1] - a1[1] * a2[0]]);
  const up = norm([-a2[0] * a2[1], 1 - a2[1] * a2[1], -a2[2] * a2[1]]);
  return { shoulder, elbow, wrist, grip, side, u, a1, a2, o, n, up, l1: len3(...elbow.map((v, i) => v - shoulder[i])), l2: len3(...wrist.map((v, i) => v - elbow[i])) };
}
export const STEM = { x: 0.02, z: 0.72, bottom: -0.74, top: -0.03 };
const LIMBS = [
  limb([0.53, -0.06, 0.0], [0.68, -0.8, 0.22], [STEM.x, -0.34, STEM.z], -1),
  limb([-0.53, -0.06, 0.02], [-0.68, -0.82, 0.24], [STEM.x, -0.56, STEM.z], 1),
];

// breastplate with a keel, tapered sides, plackart seam and faulds
function torso(x, y, z) {
  rot(z, y + 0.62, 0.1);
  const cz = R.a, cy = R.b, ax = abs(x);
  let d = ellipsoid(x, cy, cz, 0.58, 0.76, 0.44);
  d = max(d, ax * 0.41036 + cz * 0.91192 - 0.345);
  d = max(d, ax * 0.95783 + cy * 0.28735 - 0.5);
  d = max(d, -cz - 0.31);
  d = max(d, -(abs(cy + 0.24) - 0.006));
  const by = y + 0.1, bz = z + 0.02;
  d = smin(d, max(ellipsoid(x, by, bz, 0.6, 0.25, 0.36), ax * 0.41036 + bz * 0.91192 - 0.3), 0.06);
  const wy = y + 1.5, wz = z + 0.04;
  let waist = max(ellipsoid(x, wy, wz, 0.52, 0.85, 0.38), ax * 0.41036 + wz * 0.91192 - 0.31);
  waist = max(waist, -(abs(mod(y, 0.13) - 0.065) - 0.058));
  return smin(d, waist, 0.1);
}

// gorget lames
function gorget(x, y, z) {
  if (len3(x, y - 0.25, z) > 0.62) return len3(x, y - 0.25, z) - 0.55;
  let d = 1e3;
  for (let i = 0; i < 3; i++) {
    rot(z - (0.04 - i * 0.01), y - (0.29 - i * 0.052), 0.1);
    const gz = R.a, gy = R.b;
    const r = octLen(x, gz * 1.2);
    const rr = 0.15 + i * 0.042 - gy * 0.6;
    d = min(d, max(abs(r - rr) - 0.015, abs(gy) - 0.024) - 0.005);
  }
  return d;
}

// pauldron: faceted dome with ridge, rivets and rolled rim, four beaded lames, haute-piece
function pauldron(sx, y, z) {
  const bx = sx - 0.5, by = y + 0.06, bz = z + 0.02;
  const bound = len3(bx, by + 0.12, bz) - 0.52;
  if (bound > 0.04) return bound;
  rot(bx, by, 0.4);
  const qx = R.a, qy = R.b, qz = bz;
  const r = octLen(qx, qz * 0.82);
  let d = max(len2(r, qy * 1.3) - 0.265, -qy - 0.01);
  d = min(d, max(d - 0.012, abs(qz) - 0.013));
  polar(qx, qz, 16);
  d = min(d, len3(P.r - 0.25, qy - 0.026, P.t) - 0.008);
  d = min(d, max(len2(r - 0.265, qy + 0.004) - 0.013, -qx - 0.22));
  for (let i = 0; i < 4; i++) {
    const yy = qy + 0.07 + i * 0.085;
    const rr = 0.267 + i * 0.024 - yy * 0.35;
    let band = max(abs(r - rr) - 0.018, abs(yy) - 0.042);
    band = min(band, len2(r - rr - 0.01, yy + 0.04) - 0.013);
    d = min(d, max(band, -qx + 0.02));
  }
  rot(qx + 0.15, qy - 0.11, -0.3);
  const hx = R.a, hy = R.b;
  return min(d, max(abs(hx) - 0.01, max(len2(hy * 1.7, qz) - 0.19, -hy)));
}

// rerebrace with lames, couter with a wing, vambrace with ridge and seams, flared cuff
function arm(px, py, pz, L) {
  const { shoulder: S, elbow: E, wrist: W, a1, a2, o, n, up } = L;
  const bound = min(capsule(px, py, pz, ...S, ...E, 0.24), capsule(px, py, pz, ...E, ...W, 0.2));
  if (bound > 0.04) return bound;
  let upper = roundCone(px, py, pz, ...S, ...E, 0.125, 0.108);
  const h1 = (px - S[0]) * a1[0] + (py - S[1]) * a1[1] + (pz - S[2]) * a1[2];
  if (h1 > 0.22 && h1 < L.l1 - 0.1) upper = max(upper, -(abs(mod(h1, 0.1) - 0.05) - 0.043));
  const ex = px - E[0], ey = py - E[1], ez = pz - E[2];
  let cop = min(ellipsoid(ex, ey, ez, 0.122, 0.122, 0.122), roundCone(px, py, pz, E[0] - o[0] * 0.03, E[1] - o[1] * 0.03, E[2] - o[2] * 0.03, E[0] + o[0] * 0.19, E[1] + o[1] * 0.19, E[2] + o[2] * 0.19, 0.112, 0.01));
  const wing = max(max(abs(ex * n[0] + ey * n[1] + ez * n[2]) - 0.012, len3(ex, ey, ez) - 0.165), -(ex * o[0] + ey * o[1] + ez * o[2]) + 0.03);
  cop = min(cop, wing);
  const h2 = ex * a2[0] + ey * a2[1] + ez * a2[2];
  let fore = roundCone(px, py, pz, ...E, ...W, 0.1, 0.084);
  fore = max(fore, -(abs(h2 - L.l2 * 0.45) - 0.004));
  fore = max(fore, -(abs(h2 - L.l2 * 0.22) - 0.003));
  fore = min(fore, capsule(px, py, pz,
    E[0] + a2[0] * 0.1 + up[0] * 0.097, E[1] + a2[1] * 0.1 + up[1] * 0.097, E[2] + a2[2] * 0.1 + up[2] * 0.097,
    W[0] - a2[0] * 0.16 + up[0] * 0.083, W[1] - a2[1] * 0.16 + up[1] * 0.083, W[2] - a2[2] * 0.16 + up[2] * 0.083, 0.012));
  const radial = len3(ex - a2[0] * h2, ey - a2[1] * h2, ez - a2[2] * h2);
  const t = h2 - (L.l2 - 0.16);
  const cuff = max(radial - (0.092 + max(t, 0) * 0.12), abs(t - 0.07) - 0.07);
  return min(min(upper, cop), min(fore, cuff));
}

// one phalanx plate: an arc of a rounded ring around the stem axis, between two angles
function phalanx(r, psi, y, radius, from, to, halfThick, halfHeight) {
  const mid = (from + to) / 2, half = (to - from) / 2;
  const a = (abs(psi - mid) - half) * r;
  const t = abs(r - radius) - (halfThick - 0.003), h = abs(y) - (halfHeight - 0.003);
  return len3(max(a, 0), max(t, 0), max(h, 0)) + min(max(a, max(t, h)), 0) - 0.008;
}

// gauntlet closed around the vertical stem: four fingers of three overlapping phalanges with
// knuckle caps, a palm, a ridged back plate and a two-jointed thumb resting on the index finger
function gauntlet(px, py, pz, L) {
  const G = L.grip;
  const qx = px - G[0], qy = py - G[1], qz = pz - G[2];
  const bound = len3(qx, qy, qz) - 0.27;
  if (bound > 0.04) return bound;
  const ux = L.u[0], uz = L.u[2], wx = uz * L.side, wz = -ux * L.side;
  const lu = qx * ux + qz * uz, lw = qx * wx + qz * wz;
  const r = len2(lu, lw), psi = atan2(lw, -lu);
  let d = 1e3;
  for (let i = 0; i < 4; i++) {
    const fy = qy - (0.078 - i * 0.052) + (1.98 - psi) * 0.006, hh = 0.02 - i * 0.0015;
    const reach = [-0.72, -0.86, -0.78, -0.6][i];
    d = min(d, phalanx(r, psi, fy, 0.055, 1.08, 1.98, 0.016, hh));
    d = min(d, phalanx(r, psi, fy, 0.05, 0.14, 1.0, 0.0145, hh - 0.001));
    d = min(d, phalanx(r, psi, fy, 0.046, reach, 0.06, 0.013, hh - 0.0025));
    d = min(d, ellipsoid(lu + cos(1.98) * 0.06, fy, lw - sin(1.98) * 0.06, 0.019, hh + 0.002, 0.019));
    d = min(d, ellipsoid(lu + cos(1.04) * 0.057, fy, lw - sin(1.04) * 0.057, 0.013, hh - 0.003, 0.013));
  }
  d = min(d, roundBox(lu - 0.07, qy - 0.002, lw + 0.03, 0.06, 0.096, 0.03, 0.014));
  let back = roundBox(lu - 0.1, qy, lw - 0.06, 0.062, 0.096, 0.013, 0.01);
  back = min(back, capsule(lu, qy, lw, 0.05, 0.034, 0.075, 0.155, 0.034, 0.075, 0.009));
  back = min(back, capsule(lu, qy, lw, 0.05, -0.034, 0.075, 0.155, -0.034, 0.075, 0.009));
  d = min(d, back);
  d = min(d, roundCone(lu, qy, lw, 0.11, 0.08, -0.05, 0.035, 0.108, -0.066, 0.028, 0.022));
  d = min(d, ellipsoid(lu - 0.035, qy - 0.108, lw + 0.066, 0.022, 0.02, 0.022));
  d = min(d, roundCone(lu, qy, lw, 0.035, 0.108, -0.066, -0.028, 0.114, -0.038, 0.02, 0.014));
  return d;
}

export function body(x, y, z) {
  let d = min(torso(x, y, z), gorget(x, y, z));
  d = min(d, pauldron(abs(x), y, z));
  for (const L of LIMBS) d = min(d, min(arm(x, y, z, L), gauntlet(x, y, z, L)));
  d = max(d, CROP_Y - y);
  const mail = capsule(x, y, z, 0, 0.22, -0.01, 0, 0.5, 0.05, 0.105);
  out.mat = mail < d ? MAT.mail : MAT.armor;
  return min(d, mail);
}

// cloak: rises behind the shoulders, hangs open at the front with a ragged edge,
// deep pleats widening towards the hem
export function cloak(x, y, z) {
  if (y > 0.5) return y - 0.4;
  const cz = z + 0.06;
  const rho = len2(x, cz), th = atan2(x, cz), ath = abs(th);
  const drop = clamp(0.1 - y, 0, 1.35);
  const pleat = (0.02 + drop * 0.055) * sin(th * 7 + y * 1.6 + sin(th * 2.1 - y * 1.3) * 1.2);
  const rr = 0.62 + drop * 0.36 + 0.03 * sin(th * 2.5 + 0.7) + pleat - max(0, y - 0.1) * 0.9;
  let d = (abs(rho - rr) - 0.02) * 0.5;
  const lim = 1.42 + 0.08 * sin(y * 4.3) + 0.04 * sin(y * 13.1 + th) + max(0, y - 0.1) * 2.2;
  d = max(d, (lim - ath) * rho * 0.5);
  const hem = 0.3 + 0.03 * sin(th * 6);
  d = max(d, y - hem);
  const roll = len2(rho - (0.62 + 0.012 * sin(th * 14) - max(0, hem - 0.03 - 0.1) * 0.9), y - (hem - 0.03)) - 0.03;
  d = min(d, max(roll, (lim + 0.05 - ath) * rho));
  out.mat = MAT.cloth;
  return max(d, CROP_Y - y);
}

// skull helm after the artwork: wide under the crown, narrowing into a long jaw that juts forward and
// down; V brow over glowing sockets, a nose keel, vertical cage bars ending in jagged teeth, and a mane
// of pointed plates hanging at the back. Every section is octagonal, so edges stay sharp.
const JAW = -0.35;
function skull(ax, ay, az) {
  const drop = clamp(0.08 - ay, 0, 0.45);
  const cz = drop * 0.2, hx = 0.212 - drop * 0.26;
  const lz = az - cz, hz = lz > 0 ? 0.255 + drop * 0.05 : 0.25 - drop * 0.4;
  return (octLen(ax / hx, lz / hz) - 1) * min(hx, hz) * 0.72;
}
function helmet(qx, qy, qz) {
  const ax = qx, ay = qy, az = qz - 0.02, sx = abs(ax);
  let d = max(skull(ax, ay, az), max(ay - 0.185, JAW - ay));
  const shell = d;
  const front = az - clamp(0.08 - ay, 0, 0.45) * 0.2;
  // brow in a V, sockets under it, cheekbones sweeping back, a nasal notch, keel and mouth line
  const browY = 0.035 + sx * 0.3;
  d = min(d, max(shell - 0.028, max(abs(ay - browY) - 0.016, 0.1 - front)));
  d = min(d, max(shell - 0.012, max(sx - 0.01, max(max(ay + 0.05, JAW + 0.03 - ay), 0.12 - front))));
  d = min(d, max(shell - 0.011, max(abs(ay + 0.04 + (0.2 - front) * 0.08) - 0.008, max(max(front - 0.21, -front - 0.06), 0.1 - sx))));
  d = max(d, -ellipsoid(sx - 0.088, ay + 0.012, front - 0.25, 0.054, 0.032, 0.085));
  d = max(d, -max(max(sx - (ay + 0.14) * 0.32, max(-ay - 0.14, ay + 0.06)), 0.16 - front));
  d = max(d, -max(abs(ay + 0.2) - 0.005, -(shell + 0.02)));
  // cage bars: fine grooves across the lower face and cheeks
  const onSide = sx / 0.2 > abs(front) / 0.26;
  const g = onSide ? mod(front + 0.02, 0.04) - 0.02 : mod(ax + 0.02, 0.04) - 0.02;
  if (ay < (onSide ? -0.055 : -0.14)) d = max(d, -max(abs(g) - 0.0035, -(shell + 0.013)));
  // teeth: the bars carry on below the jaw line and end in points
  const coord = onSide ? front : ax;
  const id = Math.floor(coord / 0.04) + (onSide ? 50 : 0);
  const gt = mod(coord, 0.04) - 0.02;
  const len = 0.03 + 0.045 * hash1(id * 3.1 + 1);
  const t = clamp((JAW - ay) / len, 0, 1);
  const jawShell = skull(ax, max(ay, JAW), az);
  let teeth = max(max(jawShell, -(jawShell + 0.024)), abs(gt) - 0.0145 * (1 - t) - 0.001);
  teeth = max(teeth, max(ay - JAW - 0.01, JAW - len - ay));
  d = min(d, teeth * 0.8);
  // mane: pointed plates hanging behind, following the crown line
  const mr = (octLen(ax / 0.206, (az + 0.005) / 0.252) - 1) * 0.206;
  const ang = atan2(ax, -(az + 0.005));
  const mid = Math.floor((ang + 0.15) / 0.3);
  const cell = mod(ang + 0.15, 0.3) - 0.15;
  const hem = -0.13 - 0.1 * hash1(mid * 7.3) - (0.05 - abs(cell) * 0.33);
  let mane = max(abs(mr + 0.006 - max(0, -ay) * 0.08) - 0.009, max(ay - 0.1, hem - ay));
  mane = max(mane, max(abs(ang) - 1.5, -(abs(cell) * 0.2 - 0.0012)));
  d = min(d, mane);
  out.mat = MAT.armor;
  return d;
}

// crown sized to the helm: elliptical 12-sided circlet with ribs, channel and gem sockets,
// blades with collars and knots, arches with pearls
function crown(qx, qy, qz) {
  const ax = qx, ay = qy - CROWN.y, az = qz - 0.02;
  const bound = len3(ax, (ay - 0.14) * 0.8, az) - 0.45;
  if (bound > 0.04) return bound;
  const ex = ax * (CROWN.r0 / CROWN.rx), ez = az * (CROWN.r0 / CROWN.rz);
  polar(ex, ez, 12);
  const kx = P.r - CROWN.r0, kz = P.t, id = P.id;
  let d = rect2(kx, ay - 0.05, 0.013, 0.048, 0.005);
  d = min(d, len2(kx - 0.015, ay - 0.006) - 0.009);
  d = min(d, len2(kx - 0.015, ay - 0.096) - 0.008);
  d = max(d, -(len2(kx - 0.019, ay - 0.052) - 0.005));
  d = min(d, len2(len2(ay - 0.052, kz) - 0.017, kx - 0.02) - 0.0045);
  const tall = mod(id, 2) > 0.5;
  const h = tall ? 0.21 + 0.08 * hash1(id + 1) : 0.1;
  rot(kx, ay - 0.1, 0.15);
  const sx = R.a, sy = R.b;
  const taper = 1 - clamp(sy / h, 0, 1);
  const edge = max(abs(sx) * 1.8, abs(kz));
  d = min(d, max(edge - 0.024 * taper - 0.0015, max(-sy, sy - h)) * 0.55);
  d = min(d, max(edge - 0.033, abs(sy - 0.008) - 0.009));
  if (tall) d = min(d, max(edge - 0.02, abs(sy - h * 0.42) - 0.006));
  rot(ex, ez, PI / 12);
  polar(R.a, R.b, 12);
  const arx = P.r - CROWN.r0, ary = ay - 0.1, arz = P.t;
  d = min(d, max(len2(len2(arz, ary) - 0.047, arx) - 0.006, -ary));
  d = min(d, len3(arx - 0.004, ary - 0.056, arz) - 0.0095);
  return d * 0.85;
}

// head parts in the frame of the neck pivot (the runtime turns this frame towards the cursor)
export function head(vx, vy, vz) {
  const qx = vx / HS, qy = (vy - 0.4) / HS, qz = (vz - 0.03) / HS;
  const helm = helmet(qx, qy, qz), helmMat = out.mat;
  const cr = crown(qx, qy, qz);
  out.mat = cr < helm ? MAT.crown : helmMat;
  return min(helm, cr) * HS;
}

// anchor points for the runtime-built glowing parts, in head-pivot or figure space
const fromCrown = (ex, ay, ez) => [ex * (CROWN.rx / CROWN.r0) * HS, (ay + CROWN.y) * HS + 0.4, (ez * (CROWN.rz / CROWN.r0) + 0.02) * HS + 0.03];
export function anchors() {
  const gems = [], lilies = [];
  for (let k = 0; k < 12; k++) {
    const a = (k * PI) / 6;
    const normal = norm([cos(a) * (CROWN.r0 / CROWN.rx), 0, sin(a) * (CROWN.r0 / CROWN.rz)]);
    gems.push({ position: fromCrown(cos(a) * 0.272, 0.052, sin(a) * 0.272), normal, size: 0.013 * HS });
  }
  for (let k = 0; k < 6; k++) {
    const a = (k * PI) / 3 - PI / 12;
    const o = norm([cos(a) * (CROWN.r0 / CROWN.rx), 0, sin(a) * (CROWN.r0 / CROWN.rz)]);
    const tilt = 0.5 + 0.12 * hash1(k + 2);
    lilies.push({ position: fromCrown(cos(a) * 0.268, 0.145, sin(a) * 0.268), axis: norm([o[0] * sin(tilt), cos(tilt), o[2] * sin(tilt)]), scale: (0.6 + 0.1 * hash1(k + 2)) * HS });
  }
  return {
    head: { pivot: HEAD_PIVOT, gems, lilies, visor: { position: [0, -0.012 * HS + 0.4, 0.225 * HS + 0.03], halfWidth: 0.032 * HS, gap: 0.088 * HS } },
    body: { stem: { from: [STEM.x, STEM.bottom, STEM.z], to: [STEM.x, STEM.top, STEM.z] }, lily: { position: [STEM.x, STEM.top, STEM.z], axis: norm([0, cos(0.25), sin(0.25)]), scale: 1.45 } },
  };
}
