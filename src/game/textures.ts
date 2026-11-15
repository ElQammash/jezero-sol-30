import * as THREE from 'three';

/** Small value-noise helper for procedural textures (no image files needed). */
function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  let s = seed;
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const grad = (h: number, x: number, y: number) => ((h & 1) ? x : -x) + ((h & 2) ? y : -y);
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x: number, y: number, period: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = ((xi % period) + period) % period, Y = ((yi % period) + period) % period;
    const X1 = (X + 1) % period, Y1 = (Y + 1) % period;
    const a = perm[perm[X] + Y], b = perm[perm[X1] + Y], c = perm[perm[X] + Y1], d = perm[perm[X1] + Y1];
    const u = fade(xf), v = fade(yf);
    const l1 = grad(a, xf, yf) * (1 - u) + grad(b, xf - 1, yf) * u;
    const l2 = grad(c, xf, yf - 1) * (1 - u) + grad(d, xf - 1, yf - 1) * u;
    return l1 * (1 - v) + l2 * v;
  };
}

function fbm(noise: ReturnType<typeof makeNoise>, x: number, y: number, base: number, oct: number) {
  let v = 0, amp = 0.5, f = 1;
  for (let o = 0; o < oct; o++) {
    v += amp * noise(x * f, y * f, base * f);
    amp *= 0.5;
    f *= 2;
  }
  return v;
}

/** Tileable ground detail: pebbles + sand ripples, returned as albedo and normal maps. */
export function groundDetail(size = 512): { albedo: THREE.Texture; normal: THREE.Texture } {
  const noise = makeNoise(7);
  const h = new Float32Array(size * size);
  const base = 16;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / size) * base, v = (y / size) * base;
      let val = fbm(noise, u, v, base, 5) * 0.6;
      // pebbles: sharp bumps from a higher-frequency noise
      const p = noise(u * 4.3 + 11, v * 4.3 + 3, base * 4.3);
      val += Math.max(0, p - 0.25) * 1.4;
      // sand ripples
      val += Math.sin((u * 2.1 + fbm(noise, u, v, base, 2) * 2) * Math.PI * 2) * 0.05;
      h[y * size + x] = val;
    }
  const albedo = document.createElement('canvas');
  albedo.width = albedo.height = size;
  const ac = albedo.getContext('2d')!;
  const aimg = ac.createImageData(size, size);
  const normal = document.createElement('canvas');
  normal.width = normal.height = size;
  const nc = normal.getContext('2d')!;
  const nimg = nc.createImageData(size, size);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const v = h[y * size + x];
      const shade = 0.82 + v * 0.35;
      aimg.data[i] = Math.min(255, 255 * shade);
      aimg.data[i + 1] = Math.min(255, 255 * shade * 0.97);
      aimg.data[i + 2] = Math.min(255, 255 * shade * 0.94);
      aimg.data[i + 3] = 255;
      const dx = (at(x + 1, y) - at(x - 1, y)) * 3;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 3;
      const len = Math.hypot(dx, dy, 1);
      nimg.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      nimg.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      nimg.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      nimg.data[i + 3] = 255;
    }
  ac.putImageData(aimg, 0, 0);
  nc.putImageData(nimg, 0, 0);
  const mk = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { albedo: mk(albedo, true), normal: mk(normal, false) };
}

/** Brushed metal / panel-line texture for habitat modules. */
export function panelTexture(size = 256): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d9d6d0';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2200; i++) {
    g.fillStyle = `rgba(${120 + Math.random() * 60},${110 + Math.random() * 50},${100 + Math.random() * 40},0.05)`;
    g.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 40, 1);
  }
  g.strokeStyle = 'rgba(60,55,50,0.45)';
  g.lineWidth = 2;
  for (let x = 0; x <= size; x += size / 4) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, size);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(0, size / 2);
  g.lineTo(size, size / 2);
  g.stroke();
  // dust at the bottom
  const grad = g.createLinearGradient(0, size, 0, size * 0.55);
  grad.addColorStop(0, 'rgba(168,92,50,0.55)');
  grad.addColorStop(1, 'rgba(168,92,50,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Solar cell grid texture. */
export function solarTexture(size = 256): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b1a3a';
  g.fillRect(0, 0, size, size);
  const cell = size / 8;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const grad = g.createLinearGradient(x * cell, y * cell, (x + 1) * cell, (y + 1) * cell);
      grad.addColorStop(0, '#1d3d7a');
      grad.addColorStop(1, '#0c2152');
      g.fillStyle = grad;
      g.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
