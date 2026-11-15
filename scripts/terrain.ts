/**
 * Builds the game terrain from REAL NASA/USGS data: a HiRISE digital terrain model
 * of Jezero crater (Cloud Optimized GeoTIFF, USGS Astrogeology STAC), read remotely
 * around the Perseverance landing site. Only the needed window is downloaded.
 *
 * Output (public/terrain/):
 *   near.bin   Float32 heights, NEAR_N x NEAR_N, covering NEAR_M metres (playable area)
 *   far.bin    Float32 heights, FAR_N x FAR_N, covering FAR_M metres (horizon)
 *   ortho.png  8-bit HiRISE orthoimage of the playable area (surface detail)
 *   meta.json  sizes, height range, source and credit
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fromUrl } from 'geotiff';
import { PNG } from 'pngjs';

const BASE = 'https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_045994_1985_ESP_046060_1985';
const DTM = `${BASE}/DTEEC_045994_1985_046060_1985_U01.tif`;
const ORTHO = `${BASE}/ESP_045994_1985_RED_A_01_ORTHO.tif`;
const CTX_ID = 'P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W';
const CTX_DTM = `https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/ctx/controlled/usgs/${CTX_ID}/${CTX_ID}_dtm.tif`;
// Octavia E. Butler landing site (Perseverance), planetocentric
const SITE = { lat: Number(process.env.LAT ?? 18.4447), lon: Number(process.env.LON ?? 77.4508) };
const NEAR_M = 1024, NEAR_N = 513;
const FAR_M = 18000, FAR_N = 257;
const MARS_R = 3396190;

async function open(url: string) {
  const tiff = await fromUrl(url);
  const img = await tiff.getImage();
  const keys = img.getGeoKeys() as Record<string, number>;
  const [ox, oy] = img.getOrigin();
  const [rx, ry] = img.getResolution();
  const lon0 = keys.ProjNatOriginLongGeoKey ?? keys.ProjCenterLongGeoKey ?? 0;
  const latTs = keys.ProjStdParallel1GeoKey ?? 0;
  const R = keys.GeogSemiMajorAxisGeoKey ?? MARS_R;
  const toPixel = (lat: number, lon: number) => {
    const x = R * ((lon - lon0) * Math.PI / 180) * Math.cos((latTs * Math.PI) / 180);
    const y = R * ((lat * Math.PI) / 180);
    return [(x - ox) / rx, (y - oy) / ry] as const;
  };
  return { tiff, img, toPixel, res: Math.abs(rx), width: img.getWidth(), height: img.getHeight(), nodata: img.getGDALNoData(), keys };
}

async function readWindow(src: Awaited<ReturnType<typeof open>>, metres: number, n: number) {
  const [cx, cy] = src.toPixel(SITE.lat, SITE.lon);
  const half = metres / src.res / 2;
  const window = [Math.round(cx - half), Math.round(cy - half), Math.round(cx + half), Math.round(cy + half)];
  const data = (await src.img.readRasters({ window, width: n, height: n, samples: [0], interleave: true, resampleMethod: 'bilinear' })) as unknown as Float32Array;
  return { data: Float32Array.from(data), window, center: [cx, cy] };
}

/** Fill holes (no data / outside the strip) by growing in values from valid neighbours. */
function fillNoData(a: Float32Array, nodata: number | null) {
  const n = Math.round(Math.sqrt(a.length));
  const bad = (v: number) => !Number.isFinite(v) || (nodata !== null && Math.abs(v - nodata) < 1) || v < -3000 || v > -100; // Jezero region lies between about -3 km and -1 km
  const hole = new Uint8Array(a.length);
  let holes = 0;
  for (let i = 0; i < a.length; i++) if (bad(a[i])) { hole[i] = 1; holes++; }
  let left = holes;
  for (let pass = 0; pass < 4 * n && left > 0; pass++) {
    const next = hole.slice();
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (!hole[i]) continue;
      let sum = 0, cnt = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
        const j = yy * n + xx;
        if (!hole[j]) { sum += a[j]; cnt++; }
      }
      if (cnt) { a[i] = sum / cnt; next[i] = 0; left--; }
    }
    hole.set(next);
  }
  return holes / a.length;
}

async function main() {
  mkdirSync('public/terrain', { recursive: true });
  const dtm = await open(DTM);
  console.log('DTM', dtm.width, 'x', dtm.height, 'px at', dtm.res.toFixed(2), 'm, nodata', dtm.nodata, 'keys', JSON.stringify(dtm.keys).slice(0, 200));
  const near = await readWindow(dtm, NEAR_M, NEAR_N);
  const ctx = await open(CTX_DTM);
  console.log("CTX", ctx.width, "x", ctx.height, "at", ctx.res.toFixed(1), "m");
  const far = await readWindow(ctx, FAR_M, FAR_N);
  console.log('site pixel', near.center.map((v) => v.toFixed(0)).join(','), 'window', near.window.join(','));
  const nearHoles = fillNoData(near.data, dtm.nodata);
  const farHoles = fillNoData(far.data, ctx.nodata);
  const range = (a: Float32Array) => { let lo = Infinity, hi = -Infinity; for (const v of a) { if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi]; };
  const [min, max] = range(near.data);
  const [fmin, fmax] = range(far.data);
  console.log(`near heights ${min.toFixed(1)}..${max.toFixed(1)} m (holes ${(nearHoles * 100).toFixed(1)}%), far ${fmin.toFixed(1)}..${fmax.toFixed(1)} m (holes ${(farHoles * 100).toFixed(1)}%)`);
  writeFileSync('public/terrain/near.bin', Buffer.from(near.data.buffer));
  writeFileSync('public/terrain/far.bin', Buffer.from(far.data.buffer));

  // Orthoimage (surface albedo detail) for the playable area
  const ortho = await open(ORTHO);
  const ORTHO_N = 1024;
  const o = await readWindow(ortho, NEAR_M, ORTHO_N);
  const vals = Array.from(o.data).filter((v) => v > 0 && Number.isFinite(v)).sort((a, b) => a - b);
  const lo = vals[Math.floor(vals.length * 0.01)] ?? 0, hi = vals[Math.floor(vals.length * 0.99)] ?? 1;
  const png = new PNG({ width: ORTHO_N, height: ORTHO_N, colorType: 0 });
  for (let i = 0; i < ORTHO_N * ORTHO_N; i++) {
    const v = o.data[i] > 0 ? Math.round(Math.min(1, Math.max(0, (o.data[i] - lo) / (hi - lo))) * 255) : 128;
    png.data[i * 4] = png.data[i * 4 + 1] = png.data[i * 4 + 2] = v;
    png.data[i * 4 + 3] = 255;
  }
  writeFileSync('public/terrain/ortho.png', PNG.sync.write(png, { colorType: 0 }));

  writeFileSync(
    'public/terrain/meta.json',
    JSON.stringify(
      {
        near: { size: NEAR_M, n: NEAR_N, min, max },
        far: { size: FAR_M, n: FAR_N, min: fmin, max: fmax },
        ortho: { n: ORTHO_N },
        site: SITE,
        sourceFar: 'CTX DTM ' + CTX_ID + ' (NASA/JPL/MSSS; USGS Astrogeology analysis-ready data)',
        source: 'HiRISE DTM DTEEC_045994_1985_046060_1985_U01 and orthoimage ESP_045994_1985 (NASA/JPL/University of Arizona; USGS Astrogeology analysis-ready data)',
        url: DTM,
      },
      null,
      2,
    ),
  );
  console.log('written public/terrain/*');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
