/** Prints the data-sources table (Markdown) straight from src/data/nasa.ts. */
import { NASA, type DataEntry } from '../src/data/nasa';

const esc = (s: string) => s.replace(/\|/g, '/');
console.log('| Key | Value | Source | Checked | Notes |');
console.log('|---|---|---|---|---|');
for (const [key, e] of Object.entries(NASA as Record<string, DataEntry>)) {
  const flags = [e.verification, e.simplified ? 'simplified' : '', e.nasa ? '' : '**not NASA**'].filter(Boolean).join(', ');
  console.log(`| \`${key}\` | ${e.value} ${esc(e.unit)} | [${esc(e.sourceName)}](${e.sourceUrl}) | ${flags} | ${esc(e.note ?? '')} |`);
}
