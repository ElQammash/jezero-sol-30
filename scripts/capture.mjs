// Capture fresh gameplay screenshots from the running dev server for the deck, docs and submission.
// node scripts/capture.mjs [url]   -> docs/screenshots/*.png
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://localhost:5173';
const out = 'docs/screenshots';
const b = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await b.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const js = (f, ...a) => page.evaluate(f, ...a);
const shot = async (name, wait = 2500) => {
  await sleep(wait);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', name);
};
const prep = async (lang = 'en', shotMode = false) => {
  await page.goto(url + (shotMode ? '?shot=1' : ''), { waitUntil: 'load' });
  await js((l) => {
    localStorage.clear();
    localStorage.setItem('jezero-sol-30-v2', JSON.stringify({ lang: l, gender: 'f', quality: 'high', speed: 0 }));
    localStorage.setItem('jezero-tutorial-done', '1');
    localStorage.setItem('jezero-hints-off', '1');
  }, lang);
  await page.reload({ waitUntil: 'load' });
  await sleep(7000);
};

// 1. clean cinematic hero shots (no interface)
await prep('en', true);
await shot('hero-colony', 4000);
await shot('hero-colony-2', 9000);

// 2. in-game: start a mission, surface habitat, give orders, mid-morning
await prep('en');
await js(() => {
  const g = window.__game.getState();
  g.goto('play');
  g.choose('A');
});
await sleep(500);
await js(() => {
  const s = window.__game.getState();
  s.closeOutcome();
  window.__game.setState({ speed: 0, clock: 0.03 });
  window.__world.getState().player.set(6, 0, 30);
  window.__input.camYaw = 0.25;
});
await shot('play-goal-arrows', 3000);

// crew at work on the panels
await js(() => {
  const s = window.__game.getState();
  s.setTasks(['cleanPanels', 'pileRegolith']);
  window.__game.setState({ clock: 0.24 });
  window.__world.getState().player.set(10.5, 0, 3.5);
  Object.assign(window.__input, { camYaw: 0.55, camPitch: 0.2, camDist: 4.5 });
});
await shot('crew-working', 3500);

// mission log + live meters
await js(() => {
  window.__game.getState().setLog(true);
  window.__world.getState().player.set(6, 0, 26);
  Object.assign(window.__input, { camYaw: 0.25, camPitch: 0.32, camDist: 7.5 });
});
await shot('mission-log', 2500);
await js(() => window.__game.getState().setLog(false));

// before / after: dusty panels vs clean panels, with the power forecast in the base computer
const panels = async (clean, name) => {
  await js((c) => {
    const s = window.__game.getState();
    window.__game.setState({ game: { ...s.game, panelClean: c, battery: 150, tasks: [] }, clock: 0.2 });
    window.__world.getState().player.set(27, 0, 9);
    Object.assign(window.__input, { camYaw: 0.05, camPitch: 0.3, camDist: 7 });
    window.__game.getState().setLog(true);
  }, clean);
  await shot(name, 3000);
  await js(() => window.__game.getState().setLog(false));
};
await panels(0.35, 'panels-dusty');
await panels(1, 'panels-clean');

// Source button in action: tap the Power meter, then its Source button
await js(() => document.querySelector('.mchip')?.click());
await sleep(400);
await js(() => document.querySelector('.mchip-pop .src-btn')?.click());
await shot('source-button', 1500);
await js(() => document.querySelector('.overlay.top')?.click());
await sleep(300);
await js(() => document.querySelector('.mchip.open')?.click());

// 3. advance to the life-support crisis, pick the greenhouse, grow crops
await js(() => {
  const s = window.__game.getState();
  s.setTasks(['cleanPanels', 'maintain']);
  for (let i = 0; i < 6; i++) {
    const st = window.__game.getState();
    if (st.game.pendingStage) break;
    st.finishSol();
  }
});
await sleep(500);
await shot('crisis-card', 2500);
await js(() => {
  const g = window.__game.getState();
  if (g.game.pendingStage === 'lifeSupport') g.choose('B');
});
await sleep(400);
await js(() => {
  window.__game.getState().closeOutcome();
  const st = window.__game.getState();
  st.setTasks(['tendGreenhouse', 'cleanPanels']);
  for (let i = 0; i < 3; i++) if (!window.__game.getState().game.pendingStage) window.__game.getState().finishSol();
  window.__game.setState({ clock: 0.2, toast: null });
  window.__world.getState().player.set(-22, 0, 25);
  Object.assign(window.__input, { camYaw: 0, camPitch: 0.36, camDist: 9 });
});
await shot('crops-growing', 3500);

// 4. training step with the pointing hand (meters)
await js(() => {
  localStorage.removeItem('jezero-tutorial-done');
  window.__game.setState({ tutorialDone: false });
  window.__game.getState().setTutorial(6);
  window.__world.getState().player.set(6, 0, 26);
  Object.assign(window.__input, { camYaw: 0.25, camPitch: 0.32, camDist: 7.5 });
});
await shot('tutorial-pointer', 2500);
await js(() => window.__game.getState().setTutorial(null, true));

// 5. dust storm crisis
await js(() => {
  for (let i = 0; i < 6; i++) {
    const st = window.__game.getState();
    if (st.game.pendingStage) break;
    st.finishSol();
  }
});
await shot('storm-crisis', 3000);

// 6. Arabic on a phone
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await prep('ar');
await js(() => {
  const g = window.__game.getState();
  g.goto('play');
  g.choose('A');
});
await sleep(500);
await js(() => {
  window.__game.getState().closeOutcome();
  window.__game.setState({ speed: 1, clock: 0.15 });
});
await shot('arabic-mobile', 3500);
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await b.close();
