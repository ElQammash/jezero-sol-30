/**
 * Source check: request every URL behind src/data/nasa.ts and the NASA assets, then look for
 * each value in the source's own text (HTML, or the PDF for NASA technical reports).
 * Writes docs/SOURCES_CHECK.md and docs/sources-check.json.
 *   NODE_OPTIONS="--dns-result-order=ipv4first" npx tsx scripts/check-sources.ts
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { NASA, type DataEntry } from '../src/data/nasa';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const CACHE = '.tmp/sources';
mkdirSync(CACHE, { recursive: true });

/** NASA Technical Reports Server: the landing page has no numbers; the report PDF does. */
/** Pages that render in the browser only: check the same record through its public data API. */
const EVIDENCE: Record<string, string> = {
  potatoEnergy: 'https://api.nal.usda.gov/fdc/v1/food/170026?api_key=DEMO_KEY&format=abridged',
};
function evidenceUrl(url: string, key = ''): string {
  if (EVIDENCE[key]) return EVIDENCE[key];
  const m = url.match(/ntrs\.nasa\.gov\/citations\/(\d+)/);
  return m ? `https://ntrs.nasa.gov/api/citations/${m[1]}/downloads/${m[1]}.pdf` : url;
}

/** The ways a value may be written in its source. */
const NEEDLES: Record<string, string[]> = {
  oxygenPerCrewDay: ['0.816'],
  co2PerCrewDay: ['1.04'],
  waterPerCrewDay: ['2.5'],
  packagedFoodPerCrewDay: ['1.83'],
  foodEnergyPerCrewDay: ['12.59'],
  potatoYield: ['105.3'],
  potatoOxygen: ['32.23'],
  potatoEnergy: ['"amount":322', '"amount":322.0'],
  issWaterRecovery: ['98%', '98 percent'],
  electrolysisWater: [],
  solarIrradianceMars: ['586.2'],
  solDuration: ['24.6597'],
  marsGravity: ['0.38', '3.71'],
  marsCO2: ['95.1'],
  marsPressure: ['6.36'],
  marsNightTemp: ['-70', '−70', 'minus 70', '70 degrees'],
  marsDayTemp: ['0 °C', '0°C', '32 degrees', 'freezing'],
  blueSunset: ['956th Martian day'],
  marsSurfaceDose: ['0.67 millisieverts per day'],
  solarStorm2024: ['8,100', '8.1', '8100'],
  waterShielding: ['0.102'],
  solarCellEfficiency: ['XTJ-Prime 30.7'],
  moxieRate: ['12 grams of oxygen an hour'],
  moxiePower: ['Power 300 watts'],
  dustStormTau2018: ['10.8'],
  kilopowerOutput: ['10 kW', '10 kilowatt', '10-kW', '10 kWe'],
  ingenuityFlights: ['72'],
  lightDelayMin: ['54.6'],
  lightDelayMax: ['401.4'],
};

interface Row {
  key: string;
  value: string;
  url: string;
  evidence: string;
  status: number | string;
  found: string | null;
  result: 'verified' | 'reachable, value not in page text' | 'derived (no lookup)' | 'unreachable';
}

async function getText(url: string, tries = 3): Promise<{ status: number | string; text: string }> {
  for (let i = 0; i < tries - 1; i++) {
    const r = await getTextOnce(url);
    if (r.status === 200 && r.text.length > 2000) return r;
    await new Promise((res) => setTimeout(res, 3000));
  }
  return getTextOnce(url);
}
async function getTextOnce(url: string): Promise<{ status: number | string; text: string }> {
  const file = `${CACHE}/${Buffer.from(url).toString('base64url').slice(0, 120)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(60000) });
    const buf = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get('content-type') ?? '';
    if (type.includes('pdf') || url.endsWith('.pdf')) {
      if (!existsSync(file + '.pdf')) writeFileSync(file + '.pdf', buf);
      execFileSync('pdftotext', ['-layout', file + '.pdf', file + '.txt']);
      const text = (await import('node:fs')).readFileSync(file + '.txt', 'utf8');
      return { status: res.status, text };
    }
    const text = buf
      .toString('utf8')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/g, ' ')
      .replace(/&deg;/g, '°')
      .replace(/&minus;/g, '−')
      .replace(/\s+/g, ' ');
    return { status: res.status, text };
  } catch (e) {
    return { status: (e as Error).name, text: '' };
  }
}

const rows: Row[] = [];
const pages = new Map<string, { status: number | string; text: string }>();
for (const [key, e] of Object.entries(NASA as Record<string, DataEntry>)) {
  const ev = evidenceUrl(e.sourceUrl, key);
  if (!pages.has(ev)) pages.set(ev, await getText(ev));
  const page = pages.get(ev)!;
  const needles = NEEDLES[key] ?? [String(e.value)];
  const found = needles.find((n) => page.text.includes(n)) ?? null;
  const ok = typeof page.status === 'number' && page.status < 400;
  rows.push({
    key,
    value: `${e.value} ${e.unit}`,
    url: e.sourceUrl,
    evidence: ev,
    status: page.status,
    found,
    result: !ok ? 'unreachable' : needles.length === 0 ? 'derived (no lookup)' : found ? 'verified' : 'reachable, value not in page text',
  });
  console.log(key, page.status, found ?? '-');
}

// NASA assets and other references
const ASSETS: [string, string][] = [
  ['HiRISE DTM DTEEC_045994_1985_046060_1985_U01 (USGS ARD)', 'https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_045994_1985_ESP_046060_1985/DTEEC_045994_1985_046060_1985_U01.tif'],
  ['HiRISE observation ESP_045994_1985', 'https://www.uahirise.org/ESP_045994_1985'],
  ['CTX DTM P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W (USGS ARD)', 'https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/ctx/controlled/usgs/P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W/P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W_dtm.tif'],
  ['NASA Perseverance 3D model page', 'https://science.nasa.gov/resource/mars-perseverance-rover-3d-model/'],
  ['NASA Perseverance glTF file', 'https://assets.science.nasa.gov/content/dam/science/psd/mars/resources/gltf_files/25042_Perseverance.glb'],
  ['Perseverance microphone: first sounds (wind)', 'https://science.nasa.gov/resource/nasas-perseverance-rover-microphone-captures-sounds-from-mars/'],
  ['Perseverance microphone: rover driving, sol 16', 'https://science.nasa.gov/resource/sounds-of-perseverance-mars-rover-driving-sol-16-90-second-highlights/'],
];
const assetRows: { name: string; url: string; status: number | string }[] = [];
for (const [name, url] of ASSETS) {
  let status: number | string;
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': UA, Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(60000) });
    status = res.status;
    await res.arrayBuffer().catch(() => null);
  } catch (e) {
    status = (e as Error).name;
  }
  assetRows.push({ name, url, status });
  console.log(name, status);
}

writeFileSync('docs/sources-check.json', JSON.stringify({ checkedAt: new Date().toISOString(), rows, assetRows }, null, 2));
const date = new Date().toISOString().slice(0, 10);
const n = (r: Row['result']) => rows.filter((x) => x.result === r).length;
let md = `# Source check (${date})\n\nGenerated by \`scripts/check-sources.ts\`. The script requests every source URL in [src/data/nasa.ts](../src/data/nasa.ts), then looks for each value in the source's own text. For NASA Technical Reports (NTRS), it uses the report PDF behind the citation page.\n\n`;
md += `**Summary:** ${rows.length} values; **${n('verified')} verified automatically** (the value appears in the source text), ${n('reachable, value not in page text')} reachable but not found as text (see the review notes below), ${n('derived (no lookup)')} derived by us, ${n('unreachable')} unreachable. NASA asset links reachable: ${assetRows.filter((a) => typeof a.status === 'number' && a.status < 400).length} of ${assetRows.length}.\n\n`;
md += `| Key | Value | HTTP | Found as | Result | Source |\n|---|---|---|---|---|---|\n`;
for (const r of rows) md += `| \`${r.key}\` | ${r.value} | ${r.status} | ${r.found ? '`' + r.found + '`' : '—'} | ${r.result} | ${r.url}${r.evidence !== r.url ? ` (PDF: ${r.evidence})` : ''} |\n`;
md += `\n## NASA assets\n\n| Asset | HTTP | URL |\n|---|---|---|\n`;
for (const a of assetRows) md += `| ${a.name} | ${a.status} | ${a.url} |\n`;
if (existsSync('docs/sources-corrections.md')) md += '\n' + (await import('node:fs')).readFileSync('docs/sources-corrections.md', 'utf8');
writeFileSync('docs/SOURCES_CHECK.md', md);
console.log(`verified ${n('verified')}/${rows.length}`);
