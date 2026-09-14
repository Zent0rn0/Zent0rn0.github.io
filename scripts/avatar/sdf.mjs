// Scalar signed-distance primitives for the avatar bake. Everything works on plain numbers so the
// mesher can evaluate millions of samples without allocating.
const { abs, sqrt, min, max, sin, cos, atan2, floor, PI, sign } = Math;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const mod = (a, n) => a - n * floor(a / n);
export const len2 = (x, y) => sqrt(x * x + y * y);
export const len3 = (x, y, z) => sqrt(x * x + y * y + z * z);
export const hash1 = n => { const s = sin(n) * 43758.5453; return s - floor(s); };
export const smin = (a, b, k) => { const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); };
// octagonal "radius": plates get flat facets instead of round sections
export const octLen = (x, z) => { x = abs(x); z = abs(z); return max(max(x, z), (x + z) * 0.70710678); };

export function ellipsoid(x, y, z, rx, ry, rz) {
  const k0 = len3(x / rx, y / ry, z / rz);
  const k1 = len3(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return k1 < 1e-9 ? -min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}

export function capsule(px, py, pz, ax, ay, az, bx, by, bz, r) {
  const pax = px - ax, pay = py - ay, paz = pz - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  return len3(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}

export function box(x, y, z, bx, by, bz) {
  const qx = abs(x) - bx, qy = abs(y) - by, qz = abs(z) - bz;
  return len3(max(qx, 0), max(qy, 0), max(qz, 0)) + min(max(qx, max(qy, qz)), 0);
}
export const roundBox = (x, y, z, bx, by, bz, r) => box(x, y, z, bx, by, bz) - r;

// 2D rounded rectangle, used for ring and band profiles
export function rect2(x, y, bx, by, r) {
  const qx = abs(x) - bx, qy = abs(y) - by;
  return len2(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - r;
}

// cone between two points with independent end radii (iq)
export function roundCone(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - ax, pay = py - ay, paz = pz - az;
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const xx = pax * l2 - bax * y, xy = pay * l2 - bay * y, xz = paz * l2 - baz * y;
  const x2 = xx * xx + xy * xy + xz * xz, y2 = y * y * l2, z2 = z * z * l2;
  const k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

// polar repetition around the y axis: fills P with radial / tangential coordinates and the cell id
export const P = { r: 0, t: 0, id: 0 };
export function polar(x, z, n) {
  const an = (2 * PI) / n;
  let a = atan2(z, x) + an * 0.5;
  P.id = floor(a / an);
  a = mod(a, an) - an * 0.5;
  const l = len2(x, z);
  P.r = cos(a) * l;
  P.t = sin(a) * l;
}

// rotate the pair (a, b) so that the direction (sin t, cos t) lands on (0, 1); result in R
export const R = { a: 0, b: 0 };
export function rot(a, b, t) {
  const c = cos(t), s = sin(t);
  R.a = c * a - s * b;
  R.b = s * a + c * b;
}
