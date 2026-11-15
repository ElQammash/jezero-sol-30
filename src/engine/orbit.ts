/**
 * Earth–Mars distance and light delay from JPL's "Keplerian Elements for
 * Approximate Positions of the Major Planets" (Standish, valid 1800–2050):
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html
 */
const AU_KM = 149_597_870.7;
const C_KM_S = 299_792.458;
const DEG = Math.PI / 180;

interface Elements {
  a: [number, number];
  e: [number, number];
  I: [number, number];
  L: [number, number];
  peri: [number, number]; // longitude of perihelion
  node: [number, number]; // longitude of ascending node
}

// [value at J2000, rate per Julian century]
const EARTH: Elements = {
  a: [1.00000261, 0.00000562],
  e: [0.01671123, -0.00004392],
  I: [-0.00001531, -0.01294668],
  L: [100.46457166, 35999.37244981],
  peri: [102.93768193, 0.32327364],
  node: [0, 0],
};
const MARS: Elements = {
  a: [1.52371034, 0.00001847],
  e: [0.0933941, 0.00007882],
  I: [1.84969142, -0.00813131],
  L: [-4.55343205, 19140.30268499],
  peri: [-23.94362959, 0.44441088],
  node: [49.55953891, -0.29257343],
};

function position(el: Elements, T: number): [number, number, number] {
  const at = (p: [number, number]) => p[0] + p[1] * T;
  const a = at(el.a);
  const e = at(el.e);
  const I = at(el.I) * DEG;
  const L = at(el.L);
  const peri = at(el.peri);
  const node = at(el.node);
  const w = (peri - node) * DEG;
  let M = ((L - peri) % 360) * DEG;
  if (M > Math.PI) M -= 2 * Math.PI;
  if (M < -Math.PI) M += 2 * Math.PI;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const O = node * DEG;
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp,
  ];
}

/** Julian centuries since J2000 for a UTC date. */
export function centuriesSinceJ2000(date: Date): number {
  const jd = date.getTime() / 86_400_000 + 2440587.5;
  return (jd - 2451545.0) / 36525;
}

export function earthMarsDistanceKm(date: Date): number {
  const T = centuriesSinceJ2000(date);
  const e = position(EARTH, T);
  const m = position(MARS, T);
  return Math.hypot(m[0] - e[0], m[1] - e[1], m[2] - e[2]) * AU_KM;
}

export function lightDelayMinutes(date: Date): number {
  return earthMarsDistanceKm(date) / C_KM_S / 60;
}

/** Story date of the landing (sol 1). */
export const LANDING_DATE = new Date(Date.UTC(2038, 9, 12, 12, 0, 0));

export function dateOfSol(sol: number): Date {
  return new Date(LANDING_DATE.getTime() + (sol - 1) * 88_775_244); // 24.6597 h
}
