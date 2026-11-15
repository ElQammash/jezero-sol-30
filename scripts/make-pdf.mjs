// Render a Markdown doc to a styled PDF with headless Chrome: node scripts/make-pdf.mjs docs/PROJECT.md docs/PROJECT.pdf
import { readFileSync } from 'node:fs';
import { marked } from 'marked';
import puppeteer from 'puppeteer-core';
const [src = 'docs/PROJECT.md', out = 'docs/PROJECT.pdf'] = process.argv.slice(2);
const md = readFileSync(src, 'utf8').replace(/\]\((\.\.\/)?(src|scripts|docs)\//g, '](https://github.com/ElQammash/jezero-sol-30/blob/main/$2/');
const body = marked.parse(md);
const rtl = /[\u0600-\u06FF]{20,}/.test(md.slice(0, 2000));
const html = `<!doctype html><html lang="${rtl ? 'ar' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 15mm 13mm; }
body { font-family: 'Segoe UI', Tahoma, 'Noto Sans Arabic', sans-serif; font-size: 10.5pt; line-height: 1.5; color: #22160f; }
h1 { font-size: 21pt; color: #7a2a12; border-bottom: 3px solid #e2763a; padding-bottom: 6px; }
h2 { font-size: 14pt; color: #9c3a17; margin-top: 18px; page-break-after: avoid; }
h3 { font-size: 12pt; color: #5a2410; page-break-after: avoid; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 8.8pt; }
th, td { border: 1px solid #e3c9b9; padding: 4px 6px; vertical-align: top; text-align: start; }
th { background: #fbefe7; } tr { page-break-inside: avoid; }
code { background: #f5ece6; padding: 0 3px; border-radius: 3px; font-size: 8.8pt; }
pre { background: #f5ece6; padding: 8px; border-radius: 6px; font-size: 8.5pt; white-space: pre-wrap; }
blockquote { margin: 8px 0; padding: 8px 12px; background: #fdf4ee; border-inline-start: 4px solid #e2763a; }
a { color: #b4471b; text-decoration: none; word-break: break-word; }
</style></head><body>${body}</body></html>`;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const pg = await b.newPage();
await pg.setContent(html, { waitUntil: 'load' });
await pg.pdf({ path: out, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#999">Jezero: Sol 30 · Team AstraQuest · Malak Tamer Said Ahmad &amp; Rowina Walid Abdul Rahman · <span class="pageNumber"></span></div>', margin: { top: '15mm', bottom: '15mm', left: '13mm', right: '13mm' } });
await b.close();
console.log('wrote', out);
