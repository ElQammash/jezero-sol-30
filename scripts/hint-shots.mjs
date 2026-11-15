// Make the illustrated hint-card images from the real game: set up each situation, draw numbered
// circles and arrows on the exact HUD element or world object, screenshot, export small WebP.
// node scripts/hint-shots.mjs [url]  -> public/hints/<id>-<lang>.webp
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://localhost:5173';
const OUT = 'public/hints';
const TMP = '.tmp/hints';
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const b = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await b.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const js = (f, ...a) => page.evaluate(f, ...a);

/** Draw numbered circles + arrows over the targets (CSS selectors or screen fractions). */
async function annotate(targets) {
  await js((targets) => {
    document.getElementById('anno')?.remove();
    const W = innerWidth;
    const H = innerHeight;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'anno';
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;font-family:Segoe UI,sans-serif';
    let html = '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#4FB3D9"/></marker></defs>';
    targets.forEach((tg, i) => {
      let r;
      if (tg.sel) {
        const el = document.querySelector(tg.sel);
        if (!el) return;
        const b = el.getBoundingClientRect();
        r = { x: b.left, y: b.top, w: b.width, h: b.height };
      } else r = { x: tg.x * W - 40, y: tg.y * H - 40, w: 80, h: 80 };
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      html += `<rect x="${r.x - 6}" y="${r.y - 6}" width="${r.w + 12}" height="${r.h + 12}" rx="12" fill="none" stroke="#4FB3D9" stroke-width="4"/>`;
      // badge placed toward the centre of the screen, with an arrow to the target
      const dx = W / 2 - cx;
      const dy = H / 2 - cy;
      const len = Math.hypot(dx, dy) || 1;
      const off = Math.min(150, Math.max(90, len * 0.35));
      const bx = Math.min(W - 40, Math.max(40, cx + (dx / len) * off));
      const by = Math.min(H - 40, Math.max(40, cy + (dy / len) * off));
      const ex = cx + (dx / len) * (Math.min(r.w, r.h) / 2 + 12);
      const ey = cy + (dy / len) * (Math.min(r.w, r.h) / 2 + 12);
      html += `<line x1="${bx}" y1="${by}" x2="${ex}" y2="${ey}" stroke="#4FB3D9" stroke-width="5" marker-end="url(#ah)"/>`;
      html += `<circle cx="${bx}" cy="${by}" r="26" fill="#E2652A" stroke="#F6ECE3" stroke-width="4"/>`;
      html += `<text x="${bx}" y="${by + 10}" text-anchor="middle" font-size="28" font-weight="800" fill="#F6ECE3">${i + 1}</text>`;
    });
    svg.innerHTML = html;
    document.body.appendChild(svg);
  }, targets);
}

async function start(lang) {
  await page.goto(url, { waitUntil: 'load' });
  await js((l) => {
    localStorage.clear();
    localStorage.setItem('jezero-sol-30-v2', JSON.stringify({ lang: l, gender: 'm', quality: 'high', speed: 0 }));
    localStorage.setItem('jezero-tutorial-done', '1');
    localStorage.setItem('jezero-hints-off', '1');
  }, lang);
  await page.reload({ waitUntil: 'load' });
  await sleep(6500);
  await js(() => {
    const g = window.__game.getState();
    g.goto('play');
    g.choose('A');
  });
  await sleep(400);
  await js(() => {
    window.__game.getState().closeOutcome();
    window.__game.setState({ speed: 0, clock: 0.12, toast: null });
    window.__world.getState().player.set(6, 0, 28);
    Object.assign(window.__input, { camYaw: 0.25, camPitch: 0.32, camDist: 7.5 });
  });
  await sleep(1500);
}

const reset = () =>
  js(() => {
    document.getElementById('anno')?.remove();
    const s = window.__game.getState();
    s.openModal(null);
    s.setLog(false);
    window.__game.setState({ action: null });
    document.querySelector('.overlay.top')?.click();
    document.querySelector('.mchip.open')?.click();
  });

const HINTS = {
  move: { setup: () => {}, targets: [{ x: 0.5, y: 0.6 }, { sel: '.help' }] },
  arrows: { setup: () => window.__game.getState().setTasks([]), targets: [{ x: 0.62, y: 0.66 }, { sel: '.world-marker' }] },
  meters: { setup: () => {}, targets: [{ sel: '.mchips' }, { sel: '.sol-clock .ring' }] },
  computer: { setup: () => window.__game.getState().openModal('computer'), targets: [{ sel: '.corner-actions .round-btn' }, { sel: '.task-grid' }] },
  crew: {
    setup: () => {
      window.__game.getState().setTasks(['cleanPanels', 'pileRegolith']);
      window.__game.getState().openModal('computer');
    },
    targets: [{ sel: '.task.on .who' }],
  },
  goal: { setup: () => window.__game.getState().setTasks([]), targets: [{ sel: '.goal-pill' }] },
  speed: { setup: () => {}, targets: [{ sel: '.speed' }, { sel: '.corner-actions .round-btn.primary' }] },
  crisis: {
    setup: () => {
      const s = window.__game.getState();
      window.__game.setState({ game: { ...s.game, pendingStage: 'lifeSupport' }, modal: 'stage' });
    },
    targets: [{ sel: '.card .pips' }, { sel: '.card:nth-child(2) .pips' }],
  },
  timed: {
    setup: () => window.__game.setState({ action: { stage: 'communication', option: 'A', site: 'habitat', deadline: 34, objective: 'shelter' } }),
    targets: [{ sel: '.nav-pill .countdown' }, { x: 0.56, y: 0.7 }],
  },
  storm: {
    setup: () => {
      const s = window.__game.getState();
      window.__game.setState({ game: { ...s.game, storm: { day: 1, plan: 'B' } } });
    },
    wait: 6000,
    targets: [{ x: 0.5, y: 0.22 }, { sel: '.mchip' }],
  },
  crops: {
    setup: () => {
      const s = window.__game.getState();
      window.__game.setState({ game: { ...s.game, lifeSupport: 'greenhouse', greenhouseAge: 3, greenhouseHealth: 0.9, settings: { ...s.game.settings, greenhouseOn: true } } });
      window.__world.getState().player.set(-22, 0, 25);
      Object.assign(window.__input, { camYaw: 0, camPitch: 0.36, camDist: 9 });
    },
    targets: [{ sel: '.crop-badge' }],
  },
  source: {
    setup: () => document.querySelector('.mchip')?.click(),
    then: () => document.querySelector('.mchip-pop .src-btn')?.click(),
    targets: [{ sel: '.source-panel .src-value' }, { sel: '.source-panel a' }],
  },
  debrief: { end: true, targets: [{ sel: '.end-panel .btn.primary' }] },
};

for (const lang of ['en', 'ar']) {
  await start(lang);
  for (const [id, h] of Object.entries(HINTS)) {
    if (h.end) continue;
    await reset();
    await sleep(300);
    await js(h.setup);
    await sleep(h.wait ?? 1800);
    if (h.then) {
      await js(h.then);
      await sleep(800);
    }
    await annotate(h.targets);
    const png = `${TMP}/${id}-${lang}.png`;
    await page.screenshot({ path: png });
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png, '-vf', 'scale=640:-1:flags=lanczos', '-c:v', 'libwebp', '-quality', '72', `${OUT}/${id}-${lang}.webp`]);
    console.log('hint', id, lang);
    if (id === 'storm')
      await js(() => {
        const s = window.__game.getState();
        window.__game.setState({ game: { ...s.game, storm: null } });
      });
  }
  // debrief: play the mission out quickly with careless orders until it ends
  await reset();
  await js(() => {
    window.__fast = true;
    for (let i = 0; i < 40; i++) {
      const s = window.__game.getState();
      if (s.screen === 'end') break;
      if (s.game.pendingStage) {
        s.choose('B');
        const a = window.__game.getState();
        if (a.action) a.completeAction(false);
        window.__game.getState().closeOutcome();
        continue;
      }
      s.setTasks([]);
      s.finishSol();
    }
  });
  await sleep(4000);
  await annotate(HINTS.debrief.targets);
  const png = `${TMP}/debrief-${lang}.png`;
  await page.screenshot({ path: png });
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png, '-vf', 'scale=640:-1:flags=lanczos', '-c:v', 'libwebp', '-quality', '72', `${OUT}/debrief-${lang}.webp`]);
  console.log('hint debrief', lang);
}
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await b.close();
rmSync(TMP, { recursive: true, force: true });
