// Headless screenshot of the running game: node scripts/shot.mjs <url> <out.png> [w] [h] [waitMs] [js]
import puppeteer from 'puppeteer-core';
const [url = 'http://localhost:5173', out = '.tmp/shot.png', w = '1280', h = '720', wait = '6000', js = ''] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, +wait));
if (js) { await page.evaluate(js); await new Promise((r) => setTimeout(r, 2500)); }
await page.screenshot({ path: out });
console.log(logs.filter((l) => !l.includes('DevTools')).slice(-12).join('\n'));
await browser.close();
