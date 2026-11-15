/** Loads the real Jezero heightmaps (see scripts/terrain.ts) and answers height queries. */
export interface TerrainMeta {
  near: { size: number; n: number; min: number; max: number };
  far: { size: number; n: number; min: number; max: number };
  ortho: { n: number };
  site: { lat: number; lon: number };
  source: string;
  sourceFar: string;
}

export interface TerrainData {
  meta: TerrainMeta;
  near: Float32Array;
  far: Float32Array;
  /** Height of the landing site; the world origin sits here (y = 0). */
  datum: number;
}

let cache: Promise<TerrainData> | null = null;

export function loadTerrain(): Promise<TerrainData> {
  if (!cache) {
    cache = (async () => {
      const [meta, near, far] = await Promise.all([
        fetch('./terrain/meta.json').then((r) => r.json() as Promise<TerrainMeta>),
        fetch('./terrain/near.bin').then((r) => r.arrayBuffer()),
        fetch('./terrain/far.bin').then((r) => r.arrayBuffer()),
      ]);
      const n = new Float32Array(near);
      const c = (meta.near.n - 1) / 2;
      const datum = n[c * meta.near.n + c];
      return { meta, near: n, far: new Float32Array(far), datum };
    })();
  }
  return cache;
}

/** Bilinear height (world y) at world x/z, using the near map inside the play area and the far map outside. */
export function heightAt(t: TerrainData, x: number, z: number): number {
  const sample = (arr: Float32Array, size: number, n: number) => {
    const u = (x / size + 0.5) * (n - 1);
    const v = (z / size + 0.5) * (n - 1);
    const x0 = Math.max(0, Math.min(n - 2, Math.floor(u)));
    const y0 = Math.max(0, Math.min(n - 2, Math.floor(v)));
    const fx = Math.min(1, Math.max(0, u - x0));
    const fy = Math.min(1, Math.max(0, v - y0));
    const h = (i: number, j: number) => arr[j * n + i];
    return (h(x0, y0) * (1 - fx) + h(x0 + 1, y0) * fx) * (1 - fy) + (h(x0, y0 + 1) * (1 - fx) + h(x0 + 1, y0 + 1) * fx) * fy;
  };
  const half = t.meta.near.size / 2;
  if (Math.abs(x) < half - 2 && Math.abs(z) < half - 2) return sample(t.near, t.meta.near.size, t.meta.near.n) - t.datum;
  return sample(t.far, t.meta.far.size, t.meta.far.n) - t.datum;
}
