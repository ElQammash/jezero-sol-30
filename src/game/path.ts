import { COLLIDERS, SEGMENTS, SITES } from './world/Base';

export type P2 = { x: number; z: number };

const CELL = 1.5;

function blocked(x: number, z: number, margin: number): boolean {
  for (const [site, r] of COLLIDERS) if (Math.hypot(x - SITES[site].x, z - SITES[site].z) < r + margin) return true;
  for (const s of SEGMENTS) {
    const dx = s.bx - s.ax;
    const dz = s.bz - s.az;
    const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz || 1)));
    if (Math.hypot(x - (s.ax + dx * t), z - (s.az + dz * t)) < s.r + margin) return true;
  }
  return false;
}

function clearLine(a: P2, b: P2, margin: number): boolean {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5);
  for (let i = 1; i < n; i++) if (blocked(a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n, margin)) return false;
  return true;
}

/**
 * A walking route from a to b that goes around buildings (A* on a coarse grid over the
 * building colliders, then straightened). Falls back to a straight line if no route exists.
 */
export function routeAround(a: P2, b: P2, margin = 1.2): P2[] {
  if (clearLine(a, b, margin)) return [a, b];
  const pad = 50;
  const x0 = Math.min(a.x, b.x) - pad;
  const z0 = Math.min(a.z, b.z) - pad;
  const w = Math.ceil((Math.max(a.x, b.x) + pad - x0) / CELL);
  const h = Math.ceil((Math.max(a.z, b.z) + pad - z0) / CELL);
  if (w * h > 60000) return [a, b];
  const idx = (i: number, j: number) => j * w + i;
  const cx = (i: number) => x0 + (i + 0.5) * CELL;
  const cz = (j: number) => z0 + (j + 0.5) * CELL;
  const ci = (x: number) => Math.max(0, Math.min(w - 1, Math.floor((x - x0) / CELL)));
  const cj = (z: number) => Math.max(0, Math.min(h - 1, Math.floor((z - z0) / CELL)));
  const start = idx(ci(a.x), cj(a.z));
  const goal = idx(ci(b.x), cj(b.z));
  const wall = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) wall[idx(i, j)] = blocked(cx(i), cz(j), margin) ? 1 : 0;
  wall[start] = 0;
  wall[goal] = 0;
  const g = new Float32Array(w * h).fill(Infinity);
  const from = new Int32Array(w * h).fill(-1);
  const open: number[] = [start];
  const f = new Float32Array(w * h).fill(Infinity);
  const gi = goal % w;
  const gj = Math.floor(goal / w);
  const heur = (k: number) => Math.hypot((k % w) - gi, Math.floor(k / w) - gj);
  g[start] = 0;
  f[start] = heur(start);
  const closed = new Uint8Array(w * h);
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const i = cur % w;
    const j = Math.floor(cur / w);
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
        const nk = idx(ni, nj);
        if (wall[nk] || closed[nk]) continue;
        if (di && dj && (wall[idx(i + di, j)] || wall[idx(i, j + dj)])) continue;
        const ng = g[cur] + (di && dj ? Math.SQRT2 : 1);
        if (ng < g[nk]) {
          g[nk] = ng;
          f[nk] = ng + heur(nk);
          from[nk] = cur;
          open.push(nk);
        }
      }
  }
  if (from[goal] < 0) return [a, b];
  const cells: P2[] = [];
  for (let k = goal; k !== start && k >= 0; k = from[k]) cells.push({ x: cx(k % w), z: cz(Math.floor(k / w)) });
  cells.reverse();
  const raw = [a, ...cells.slice(0, -1), b];
  // straighten: skip ahead while the line stays clear
  const out: P2[] = [a];
  let k = 0;
  while (k < raw.length - 1) {
    let m = raw.length - 1;
    while (m > k + 1 && !clearLine(raw[k], raw[m], margin * 0.9)) m--;
    out.push(raw[m]);
    k = m;
  }
  return out;
}

/** Points every `step` metres along a polyline, with the direction of travel. */
export function samplePath(pts: P2[], step: number, max: number): { x: number; z: number; a: number }[] {
  const out: { x: number; z: number; a: number }[] = [];
  let carry = step;
  for (let i = 0; i < pts.length - 1 && out.length < max; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const len = Math.hypot(q.x - p.x, q.z - p.z);
    const a = Math.atan2(q.x - p.x, q.z - p.z);
    let d = carry;
    while (d < len && out.length < max) {
      out.push({ x: p.x + ((q.x - p.x) * d) / len, z: p.z + ((q.z - p.z) * d) / len, a });
      d += step;
    }
    carry = d - len;
  }
  return out;
}
