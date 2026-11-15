// Images for the NASA project page: a gameplay GIF from real captured frames, and three annotated PNGs.
// node scripts/submission-images.mjs [url]  -> docs/submission-images/
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://localhost:5173';
const OUT = 'docs/submission-images';
const FR = '.tmp/gif-frames';
rmSync(FR, { recursive: true, force: true });
mkdirSync(FR, { recursive: true });
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  // the real GPU (D3D11) renders ~40 fps headless; SwiftShader would give ~1 fps
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'],
});

// ---------- 1. gameplay GIF ----------
const page = await b.newPage();
await page.setViewport({ width: 960, height: 540 });
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('jezero-sol-30-v2', JSON.stringify({ lang: 'en', gender: 'f', quality: 'medium', speed: 4, quality: 'high' }));
  localStorage.setItem('jezero-tutorial-done', '1');
  localStorage.setItem('jezero-hints-off', '1');
});
await page.reload({ waitUntil: 'load' });
await sleep(6500);
await page.evaluate(() => {
  const g = window.__game.getState();
  g.goto('play');
  g.choose('A');
});
await sleep(400);
await page.evaluate(() => {
  const s = window.__game.getState();
  s.closeOutcome();
  s.setTasks(['cleanPanels', 'pileRegolith']);
  window.__game.setState({ clock: 0.07, speed: 4, toast: null });
  window.__world.getState().player.set(4, 0, 14);
  Object.assign(window.__input, { camYaw: 0.75, camPitch: 0.3, camDist: 9 });
});
await sleep(1500);
const t0 = Date.now();
let n = 0;
while (Date.now() - t0 < 13000 && n < 200) {
  await page.screenshot({ path: `${FR}/f${String(n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 });
  n++;
  // stand and watch the crew go to work, then walk toward the panels
  if (n === 40) await page.keyboard.down('KeyW');
  if (n === 62) await page.keyboard.up('KeyW');
}
const secs = (Date.now() - t0) / 1000;
await page.close();
// play back at 12 fps so the GIF lasts 10-15 s
const fps = Math.max(4, Math.round(n / secs)); // real-time playback
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(fps), '-i', `${FR}/f%04d.jpg`, '-vf', 'scale=960:-1:flags=lanczos,palettegen=max_colors=72:stats_mode=full', `${FR}/palette.png`]);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(fps), '-i', `${FR}/f%04d.jpg`, '-i', `${FR}/palette.png`, '-lavfi', 'scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=none:diff_mode=rectangle', '-loop', '0', `${OUT}/gameplay.gif`]);
console.log(`gif: ${n} frames captured in ${secs.toFixed(1)} s, ${fps} fps → ${(n / fps).toFixed(1)} s, ${(statSync(`${OUT}/gameplay.gif`).size / 1e6).toFixed(2)} MB`);

// ---------- 2. annotated PNGs ----------
const shots = [
  {
    name: '1-world-and-hud',
    src: 'docs/screenshots/play-goal-arrows.png',
    title: 'Walk a real 3D Jezero colony',
    notes: [
      { x: 0.085, y: 0.04, text: 'Sol and Mars clock: the sol runs by itself', tx: 0.2, ty: 0.2 },
      { x: 0.565, y: 0.035, text: 'Power, Oxygen, Food, Shield (tap for the NASA source)', tx: 0.58, ty: 0.2 },
      { x: 0.5, y: 0.085, text: "Today's goal, from what the colony needs most", tx: 0.33, ty: 0.32 },
      { x: 0.62, y: 0.5, text: 'Arrows on the ground lead the way', tx: 0.7, ty: 0.62 },
      { x: 0.53, y: 0.19, text: 'Crew walk to their jobs, with name tags', tx: 0.66, ty: 0.36 },
    ],
  },
  {
    name: '2-crisis-trade-offs',
    src: 'docs/screenshots/storm-crisis.png',
    title: 'Every option costs something',
    notes: [
      { x: 0.33, y: 0.618, text: 'Red icons: what you lose', tx: 0.2, ty: 0.42 },
      { x: 0.376, y: 0.618, text: 'Green icons: what you gain', tx: 0.55, ty: 0.84 },
      { x: 0.36, y: 0.643, text: 'You do this one yourself in the 3D world', tx: 0.41, ty: 0.92 },
    ],
  },
  {
    name: '3-source-button',
    src: 'docs/screenshots/source-button.png',
    title: 'Every number has a NASA source',
    notes: [
      { x: 0.513, y: 0.03, text: 'Tap a meter, then Source', tx: 0.72, ty: 0.12 },
      { x: 0.46, y: 0.355, text: 'The real value and its unit', tx: 0.2, ty: 0.3 },
      { x: 0.47, y: 0.4, text: 'Where it comes from, and how it was checked', tx: 0.18, ty: 0.48 },
      { x: 0.45, y: 0.44, text: 'One click to the original NASA page', tx: 0.2, ty: 0.64 },
    ],
  },
];
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080 });
for (const s of shots) {
  const bg = 'data:image/png;base64,' + readFileSync(s.src).toString('base64');
  const W = 1920;
  const H = 1080;
  const svg = s.notes
    .map((n, i) => {
      const x = n.x * W;
      const y = n.y * H;
      const tx = n.tx * W;
      const ty = n.ty * H;
      return `<line x1="${tx}" y1="${ty}" x2="${x}" y2="${y}" stroke="#4FB3D9" stroke-width="5" marker-end="url(#ah)"/>
<circle cx="${x}" cy="${y}" r="14" fill="none" stroke="#4FB3D9" stroke-width="5"/>
<g transform="translate(${tx},${ty})"><circle r="26" fill="#E2652A" stroke="#F6ECE3" stroke-width="4"/><text y="10" text-anchor="middle" font-size="28" font-weight="800" fill="#F6ECE3">${i + 1}</text></g>`;
    })
    .join('');
  const legend = s.notes.map((n, i) => `<li><b>${i + 1}</b>${n.text}</li>`).join('');
  await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700&family=Space+Grotesk:wght@700&display=block" rel="stylesheet"></head>
<body style="margin:0;width:1920px;height:1080px;position:relative;overflow:hidden;font-family:Inter">
<img src="${bg}" style="position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover">
<svg width="1920" height="1080" style="position:absolute;inset:0;font-family:Inter"><defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#4FB3D9"/></marker></defs>${svg}</svg>
<div style="position:absolute;left:40px;bottom:36px;max-width:820px;background:rgba(26,15,11,.9);border:2px solid rgba(246,236,227,.25);border-radius:22px;padding:22px 28px;color:#F6ECE3">
<div style="font-family:'Space Grotesk';font-size:40px;margin-bottom:10px">${s.title}</div>
<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;font-size:23px">${legend.replace(/<li><b>(\d+)<\/b>/g, '<li><b style="display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#E2652A;margin-right:12px;font-size:18px">$1</b>')}</ol>
<div style="margin-top:12px;font-size:16px;color:rgba(246,236,227,.65)">Jezero: Sol 30 · Team AstraQuest · real gameplay capture</div></div>
</body></html>`, { waitUntil: 'load', timeout: 60000 });
  await p.evaluate(() => document.fonts.ready);
  const raw = `${FR}/${s.name}.png`;
  await p.screenshot({ path: raw });
  // 8-bit palette PNG keeps each file well under 2 MB
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-vf', 'split[a][b];[a]palettegen=max_colors=256[p];[b][p]paletteuse=dither=sierra2_4a', `${OUT}/${s.name}.png`]);
  console.log(s.name, (statSync(`${OUT}/${s.name}.png`).size / 1e6).toFixed(2), 'MB');
}
await b.close();
console.log(readdirSync(OUT).join(', '));
