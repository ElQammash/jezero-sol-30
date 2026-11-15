// Screenshot the in-game HUD on desktop and phone: node scripts/hudshot.mjs [url] [lang]
import puppeteer from 'puppeteer-core';
const [url = 'http://localhost:5173', lang = 'en'] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(view, out, mobile) {
  const page = await browser.newPage();
  if (mobile) await page.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
  else await page.setViewport(view);
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate((l) => {
    localStorage.clear();
    localStorage.setItem('jezero-sol-30-v1', JSON.stringify({ lang: l, gender: 'm', quality: 'medium' }));
  }, lang);
  await page.reload({ waitUntil: 'load' });
  await sleep(6000);
  await page.evaluate(() => document.querySelector('.title-box .btn.primary').click());
  await sleep(500);
  await page.evaluate(() => document.querySelector('.intro .btn').click());
  await sleep(1500);
  await page.evaluate(() => document.querySelectorAll('.card')[0].click());
  await sleep(600);
  await page.evaluate(() => document.querySelector('.outcome-panel .btn').click());
  await sleep(3000);
  await page.screenshot({ path: out });
  await page.close();
}
await run({ width: 1366, height: 768 }, '.tmp/hud-desktop.png', false);
await run(null, '.tmp/hud-mobile.png', true);
await browser.close();
console.log('ok');
