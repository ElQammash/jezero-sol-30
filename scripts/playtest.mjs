// Plays a full mission through the real UI in headless Chrome.
// node scripts/playtest.mjs [url] [choices e.g. BBBBCA] [lang]
import puppeteer from 'puppeteer-core';
const [url = 'http://localhost:5173', choices = 'BBBBCA', lang = 'en'] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !m.text().includes('404') && errors.push(m.text()));
await page.goto(url, { waitUntil: 'load' });
await page.evaluate((l) => {
  localStorage.clear();
  localStorage.setItem('jezero-sol-30-v2', JSON.stringify({ lang: l, gender: 'f', quality: 'low', speed: 1 }));
}, lang);
await page.reload({ waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 5000));
await page.evaluate(() => ((window).__fast = true));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (sel, text) =>
  page.evaluate(
    (sel, text) => {
      const b = [...document.querySelectorAll(sel)].find((x) => !text || x.textContent.includes(text));
      if (b) b.click();
      return !!b;
    },
    sel,
    text,
  );
await click('.title-box .btn.primary');
await sleep(500);
await click('.intro .btn');
await sleep(800);
let stage = 0;
const log = [];
for (let step = 0; step < 200; step++) {
  const state = await page.evaluate(() => ({
    stage: !!document.querySelector('.stage-panel'),
    outcome: !!document.querySelector('.outcome-panel'),
    report: !!document.querySelector('.report-panel'),
    end: !!document.querySelector('.end-panel'),
    sol: document.querySelector('.sol-mini b')?.textContent,
    meters: [...document.querySelectorAll('.meter-val')].map((x) => x.textContent).join(' '),
    title: document.querySelector('.stage-panel h2')?.textContent,
    lines: [...document.querySelectorAll('.outcome-panel .lines li, .report-panel .lines li')].map((x) => x.textContent).join(' | '),
  }));
  if (state.end) {
    await sleep(1500);
    const end = await page.evaluate(() => document.querySelector('.end-panel')?.innerText);
    log.push('END: ' + end.replace(/\n+/g, ' / ').slice(0, 400));
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
    break;
  }
  if (state.stage) {
    const pick = choices[stage++] ?? 'A';
    log.push(`${state.sol} ${state.title} -> ${pick}`);
    const ok = await page.evaluate((p) => {
      const cards = [...document.querySelectorAll('.card')];
      const c = cards.find((x) => x.querySelector('.card-letter')?.textContent === p) ?? cards[0];
      c.click();
      return !!c;
    }, pick);
    if (!ok) log.push('no card');
    await sleep(300);
    continue;
  }
  if (state.outcome) {
    log.push('  outcome: ' + state.lines);
    await click('.outcome-panel .btn');
    await sleep(250);
    continue;
  }
  if (state.report) {
    log.push(`  ${state.sol} [${state.meters}] ${state.lines.slice(0, 160)}`);
    await click('.report-panel .btn');
    await sleep(250);
    continue;
  }
  // in-world action pending? (should not happen with non-world choices)
  const hasEnd = await click('.corner-actions .round-btn.primary');
  if (!hasEnd) {
    const obj = await page.evaluate(() => window.__game?.getState().action?.objective ?? '');
    // in-world action: walk (teleport, dev only) to the spot and press E
    const spot = obj === 'reactor' ? [-170, 145] : obj === 'repair' ? [10, -19.2] : obj === 'shelter' ? [0, 9.6] : null;
    if (spot) {
      log.push('  in-world: ' + obj);
      await page.evaluate(([x, z]) => window.__world.getState().player.set(x, 0, z), spot);
      await sleep(400);
      await page.keyboard.press('KeyE');
      await sleep(400);
    } else if (obj) log.push('waiting: ' + obj);
    await sleep(300);
  }
  await sleep(450);
}
console.log(log.join('\n'));
console.log('ERRORS:', errors.length ? errors.slice(0, 5).join('\n') : 'none');
await browser.close();
