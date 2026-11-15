// Render the 7-slide demo deck (docs/demo/deck.html) to PDF + one PNG per slide.
// node scripts/make-deck.mjs
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync } from 'node:fs';
import QRCode from 'qrcode';
import puppeteer from 'puppeteer-core';

const PLAY_URL = 'https://mistyrose-eland-246079.hostingersite.com/';
const src = resolve('docs/demo/deck.html');
const outPdf = resolve('docs/demo/Jezero-Sol-30-Demo.pdf');
const qr = await QRCode.toString(PLAY_URL, { type: 'svg', margin: 0, color: { dark: '#1A0F0B', light: '#F6ECE3' } });

const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const pg = await b.newPage();
await pg.setViewport({ width: 1920, height: 1080 });
await pg.goto(pathToFileURL(src).href, { waitUntil: 'networkidle0' });
await pg.evaluate((svg) => { document.getElementById('qr').innerHTML = svg; document.querySelector('#qr svg').setAttribute('width', '100%'); document.querySelector('#qr svg').setAttribute('height', '100%'); }, qr);
await pg.evaluate(() => document.fonts.ready);
const fonts = await pg.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
const count = await pg.$$eval('section.slide', (s) => s.length);
const slides = await pg.$$('section.slide');
for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: resolve(`docs/demo/slide-${i + 1}.png`) });
await pg.pdf({ path: outPdf, width: '1920px', height: '1080px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await b.close();
// Also ship the PDF with the website so the demo link is public with no login.
mkdirSync('public/demo', { recursive: true });
copyFileSync(outPdf, 'public/demo/Jezero-Sol-30-Demo.pdf');
console.log(`slides ${count}, fonts loaded: ${[...new Set(fonts)].join(', ')}`);
