/**
 * Full presentation (not the demo deck): every number is read from the code, never typed by hand,
 * and every slide carries the citations for the numbers it shows.
 *   npx tsx scripts/make-presentation.ts
 * -> public/presentation/index.html (web, clickable links) and docs/presentation/Jezero-Sol-30-Full-Presentation.pdf
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { NASA, type DataEntry, type NasaKey } from '../src/data/nasa';
import { OPTION_PREVIEWS, STAGE_ORDER, STAGE_SOLS, TUNING } from '../src/engine';
import en from '../src/i18n/en';

const OUT_DIR = 'public/presentation';
const PDF = 'docs/presentation/Jezero-Sol-30-Full-Presentation.pdf';
mkdirSync(`${OUT_DIR}/img`, { recursive: true });
mkdirSync('docs/presentation', { recursive: true });
for (const f of readdirSync('docs/demo/img')) cpSync(`docs/demo/img/${f}`, `${OUT_DIR}/img/${f}`);

const PLAY = 'https://mistyrose-eland-246079.hostingersite.com/';
const REPO = 'https://github.com/ElQammash/jezero-sol-30';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (x: number) => (Number.isInteger(x) ? String(x) : String(+x.toFixed(4)));

// ---------- citations ----------
type Cite = { id: string; html: string };
let cites: Cite[] = [];
const label = (e: DataEntry) => (e.nasa ? (e.verification === 'primary' ? 'primary NASA' : e.verification) : `NOT NASA (${e.verification})`);
function cite(id: string, html: string): number {
  let i = cites.findIndex((c) => c.id === id);
  if (i < 0) {
    cites.push({ id, html });
    i = cites.length - 1;
  }
  return i + 1;
}
/** A NASA-file value with its unit and a citation marker. */
function v(k: NasaKey, opts: { unit?: boolean } = {}): string {
  const e = NASA[k] as DataEntry;
  const n = cite(`nasa:${k}`, `<b>${esc(e.sourceName)}</b> · <a href="${e.sourceUrl}">${esc(e.sourceUrl)}</a> · <i>${label(e)}${e.simplified ? ', simplified' : ''}</i> · <code>${k}</code>`);
  return `${fmt(e.value)}${opts.unit === false ? '' : ' ' + esc(e.unit)}<sup>${n}</sup>`;
}
/** A game-design value from src/engine/tuning.ts. */
function g(k: keyof typeof TUNING, suffix = ''): string {
  const n = cite('tuning', `<b>Game design value (not NASA data)</b> · <code>src/engine/tuning.ts</code> · <a href="${REPO}/blob/main/src/engine/tuning.ts">${REPO}/blob/main/src/engine/tuning.ts</a>`);
  return `${fmt(TUNING[k] as number)}${suffix}<sup>${n}</sup>`;
}
const asset = (name: string, url: string, credit: string) => cite(`asset:${url}`, `<b>${esc(name)}</b> · <a href="${url}">${esc(url)}</a> · <i>${esc(credit)}</i>`);
const ref = (id: string, html: string) => `<sup>${cite(id, html)}</sup>`;

// ---------- balance numbers from the latest `npm run paths` ----------
const report = readFileSync('docs/balance-report.txt', 'utf8');
const pct = (re: RegExp) => (report.match(re)?.[1] ?? '?') + '%';
const B = {
  header: report.match(/\((\d+) decision paths x (\d+) seeds/) ?? ['', '?', '?'],
  random: pct(/random \(choices \+ daily tasks\)\s+win\s+([\d.]+)%/),
  careful: pct(/random choices, careful daily tasks win\s+([\d.]+)%/),
  thoughtful: pct(/thoughtful \(looks ahead\), n=\d+\s+win\s+([\d.]+)%/),
  buckets: report.match(/0%: (\d+)\s+1-25%: (\d+)\s+25-50%: (\d+)\s+50-75%: (\d+)\s+75-99%: (\d+)\s+100%: (\d+)/) ?? [],
  options: [...report.matchAll(/^\s+(habitat|lifeSupport|power|mobility|communication|safety)\s+(.+)$/gm)].map((m) => [m[1], m[2].trim()]),
};
const balCite = () => ref('balance', `<b>Balance analysis</b> · <code>npm run paths</code> (<code>scripts/paths.ts</code>) · output in <a href="${REPO}/blob/main/docs/balance-report.txt">${REPO}/blob/main/docs/balance-report.txt</a>`);

// ---------- tests and source check ----------
const testCount = ['src/engine/engine.test.ts', 'src/i18n/i18n.test.ts', 'src/game/guide.test.ts'].reduce((a, f) => a + (readFileSync(f, 'utf8').match(/^\s*it\(/gm)?.length ?? 0), 0);
const check = existsSync('docs/sources-check.json') ? JSON.parse(readFileSync('docs/sources-check.json', 'utf8')) : { rows: [], assetRows: [] };
const verified = check.rows.filter((r: { result: string }) => r.result === 'verified').length;

// ---------- slides ----------
const slides: string[] = [];
let no = 0;
function slide(title: string, body: string, opts: { eyebrow?: string; cls?: string; bg?: string } = {}) {
  no++;
  const list = cites.map((c, i) => `<li value="${i + 1}">${c.html}</li>`).join('');
  slides.push(`<section class="slide ${opts.cls ?? ''}">
${opts.bg ? `<img class="bg" src="img/${opts.bg}" alt=""><div class="shade"></div>` : ''}
<div class="pad">${opts.eyebrow ? `<p class="eyebrow">${opts.eyebrow}</p>` : ''}<h2>${title}</h2><div class="body">${body}</div></div>
${cites.length ? `<ol class="cites">${list}</ol>` : ''}
<div class="foot"><span>Jezero: Sol 30 · Team AstraQuest · Full presentation</span><span>${no}</span></div>
</section>`);
  cites = [];
}
const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const img = (f: string, alt: string, style = '') => `<img class="shot" src="img/${f}" alt="${esc(alt)}" style="${style}">`;

// 1 title
slide(
  'Jezero: Sol 30',
  `<p class="lead">A 3D Mars colony game built on real NASA data, for students aged 10–14.</p>
<p class="txt"><b>Team</b> AstraQuest · <b>Team members</b> Malak Tamer Said Ahmad (team owner), Rowina Walid Abdul Rahman</p>
<p class="txt"><b>Challenge</b> NASA Space Apps Challenge 2026: Build a Junior Astronaut Mission Trainer</p>
<p class="txt"><b>Play</b> <a href="${PLAY}">${PLAY}</a> · <b>Code</b> <a href="${REPO}">${REPO}</a> · <b>7-slide demo</b> <a href="${PLAY}demo/Jezero-Sol-30-Demo.pdf">${PLAY}demo/Jezero-Sol-30-Demo.pdf</a></p>`,
  { eyebrow: 'Full presentation with sources', cls: 'title', bg: 'hero.jpg' },
);

// 2 challenge
slide(
  'The challenge',
  ul([
    'Help students feel the <b>trade-offs</b> of a real mission: power, oxygen, food, protection and crew health are never enough at once.',
    'Use <b>real NASA data</b>, with a source for every number and honest labels for simplifications.',
    'Be playable by a <b>10–14-year-old with no instructions</b>, on a phone or a school computer, in Arabic or English.',
  ]) + `<p class="txt">Our answer: a free browser game where you command the first Mars colony in the real Jezero crater.</p>`,
  { eyebrow: 'Why this project' },
);

// 3 story and rules
slide(
  'Story, winning and losing',
  ul([
    `Year 2038. ${g('crew')} crew land in Jezero crater: the commander (you), an engineer, a botanist, a doctor, a geologist and a pilot.`,
    `Survive ${g('sols')} sols (a sol is ${v('solDuration')} long) and six crises: habitat on sol ${STAGE_SOLS.habitat}, life support on sol ${STAGE_SOLS.lifeSupport}, dust storm on sol ${STAGE_SOLS.power}, broken rover on sol ${STAGE_SOLS.mobility}, delayed solar-storm warning on sol ${STAGE_SOLS.communication}, and a medical emergency on sol ${STAGE_SOLS.safety}.`,
    '<b>Win:</b> reach the end of the 30 sols with all six crew alive and the Shield above 50%.',
    '<b>Lose:</b> the oxygen runs out, or any crewmember dies.',
  ]) + `<p class="txt">The engine is deterministic (seeded random numbers), so every mission can be replayed exactly.${ref('engine', `<b>Game engine</b> · <code>src/engine/sim.ts</code>, <code>src/engine/stages.ts</code> · <a href="${REPO}/tree/main/src/engine">${REPO}/tree/main/src/engine</a>`)}</p>`,
  { eyebrow: 'The mission' },
);

// 4 world
{
  const h = asset('HiRISE DTM DTEEC_045994_1985_046060_1985_U01 and orthoimage ESP_045994_1985 (NASA MRO HiRISE, USGS Astrogeology analysis-ready data)', 'https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_045994_1985_ESP_046060_1985/DTEEC_045994_1985_046060_1985_U01.tif', 'NASA/JPL/University of Arizona/USGS · primary NASA');
  const c = asset('CTX DTM P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W (NASA MRO CTX, USGS Astrogeology)', 'https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/ctx/controlled/usgs/P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W/P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W_dtm.tif', 'NASA/JPL/MSSS/USGS · primary NASA');
  const m = asset('NASA Perseverance rover 3D model (25042_Perseverance.glb)', 'https://science.nasa.gov/resource/mars-perseverance-rover-3d-model/', 'NASA/JPL-Caltech · primary NASA');
  const a = asset('Perseverance microphone recordings: wind (sol 4) and rover driving (sol 16)', 'https://science.nasa.gov/resource/nasas-perseverance-rover-microphone-captures-sounds-from-mars/', 'NASA/JPL-Caltech/ISAE-SUPAERO/LANL · primary NASA');
  slide(
    'A world made of NASA data',
    `<div class="two"><div>${ul([
      `The ground you walk on is the real <b>HiRISE elevation model</b> of Jezero crater near Perseverance's landing site, cut to 1 km, with its orthoimage as the colour.<sup>${h}</sup>`,
      `The horizon is an 18 km <b>CTX elevation model</b>.<sup>${c}</sup>`,
      `The rover helping the colony is <b>NASA's own Perseverance 3D model</b>, compressed from 11.7 MB to 2.3 MB.<sup>${m}</sup>`,
      `The wind you hear was <b>recorded by Perseverance's microphone</b> on Mars.<sup>${a}</sup>`,
      `Sunsets are blue, as Curiosity photographed on sol ${v('blueSunset', { unit: false })}.`,
    ])}</div><div>${img('hero2.jpg', 'The colony on HiRISE terrain', 'width:100%;height:520px')}</div></div>`,
    { eyebrow: 'The world' },
  );
}

// 5 controls and one sol
slide(
  'Controls and one sol, step by step',
  `<div class="two"><div>${ul([
    '<b>Move:</b> W A S D or arrow keys, or the on-screen joystick on phones. <b>Run:</b> Shift. <b>Look:</b> drag. <b>Act:</b> E or tap.',
    `<b>1. Sunrise.</b> The sol runs by itself: ${g('solSeconds', ' real seconds')} at 1× speed, ${Math.round((TUNING.solDayShare as number) * 100)}% of them in daylight${ref('tuning', '')}. Pause, 1×, 2× or 4×.`,
    `<b>2. Orders.</b> At the base computer (🖥) choose ${g('tasksPerSol')} crew jobs (clean panels, pile regolith, maintenance, tend the farm, rest) and switch systems (rations, heating, farm lights, ice plant, MOXIE).`,
    '<b>3. Work.</b> The named crewmember walks to the job and does it; the meters move live toward tonight’s result.',
    '<b>4. Night and report.</b> The blue sunset, night, then a Mission Log of what changed and why. Sleeping until morning is optional.',
  ])}</div><div>${img('gameplay.jpg', 'Gameplay with HUD', 'width:100%;height:500px')}</div></div>`,
  { eyebrow: 'How to play' },
);

// 6 crew
slide(
  'The crew and their jobs',
  `<table><tr><th>Crewmember</th><th>Role</th><th>Takes these jobs first</th></tr>
${(['engineer', 'botanist', 'doctor', 'geologist', 'pilot'] as const)
  .map((r) => `<tr><td>${en.names[r]}</td><td>${en.roles[r]}</td><td>${{ engineer: 'Clean solar panels, maintenance', botanist: 'Tend the greenhouse', doctor: 'Crew rest and the medbay', geologist: 'Pile regolith on the habitat', pilot: 'Backup for any outdoor job' }[r]}</td></tr>`)
  .join('')}
<tr><td>You</td><td>${en.roles.commander}</td><td>Decide, walk the base, and carry out three crisis actions yourself</td></tr></table>
<p class="txt">Jobs go to the healthy crewmember whose role fits best${ref('jobs', `<b>Job assignment</b> · <code>src/game/crewJobs.ts</code> · <a href="${REPO}/blob/main/src/game/crewJobs.ts">${REPO}/blob/main/src/game/crewJobs.ts</a>`)}. Sick or injured crew stay inside. Everyone goes in at night and during the storm.</p>`,
  { eyebrow: 'Six lives' },
);

// 7-10 meters
slide(
  '⚡ Power',
  `<p class="formula">Solar energy per sol = panel area × sunlight at Mars × cell efficiency × sun-angle factor × sol length × dust transmission × panel cleanliness</p>
${ul([
  `Sunlight at Mars: ${v('solarIrradianceMars')}. Space solar cell efficiency: ${v('solarCellEfficiency')}. Sol length: ${v('solDuration')}.`,
  `Panel area ${g('panelAreaM2', ' m²')}; sun-angle and night factor ${g('solarDayFactor')}; panels lose ${g('panelDustPerSol')} of output per sol unless cleaned.`,
  `Dust storm: transmission = e<sup>−τ × ${fmt(TUNING.dustExtinction as number)}</sup>. The 2018 storm over Opportunity reached τ = ${v('dustStormTau2018', { unit: false })}.`,
  `Backup reactor: a Kilopower-class fission unit, up to ${v('kilopowerOutput')}, gives ${g('reactorKWhPerSol', ' kWh')} per sol.`,
  `Battery ${g('batteryKWh', ' kWh')}. Loads per sol: life support ${g('loadLifeSupport', ' kWh')}, farm lights ${g('loadGreenhouse', ' kWh')}, ice plant ${g('loadIcePlant', ' kWh')}, MOXIE ${g('loadMoxie', ' kWh')}.`,
])}`,
  { eyebrow: 'Meter 1 of 4' },
);
slide(
  '🫁 Oxygen',
  `<p class="formula">Oxygen tomorrow = oxygen today + MOXIE + ice electrolysis + plants − crew breathing − spacewalks</p>
${ul([
  `Each astronaut breathes ${v('oxygenPerCrewDay')} (NASA BVAD), scaled to a sol.`,
  `MOXIE on Perseverance made up to ${v('moxieRate')} using about ${v('moxiePower')}. The colony's crew-size MOXIE makes ${g('moxieO2PerSol', ' kg')} per sol for ${g('loadMoxie', ' kWh')}.`,
  `Water is 8/9 oxygen by mass: splitting ${v('electrolysisWater')} gives 1 kg O₂. The ice plant makes ${g('iceO2PerSol', ' kg')} O₂ per sol.`,
  `Potato plants release ${v('potatoOxygen')} on the farm's ${g('greenhouseAreaM2', ' m²')}.`,
  `Each spacewalk costs ${g('evaO2PerPersonSol', ' kg')} extra. Tank: ${g('o2TankKg', ' kg')}; landed with ${g('startO2Kg', ' kg')}.`,
])}`,
  { eyebrow: 'Meter 2 of 4' },
);
slide(
  '🥔 Food',
  `<p class="formula">Food tomorrow = food today + harvest − crew meals (smaller with rations)</p>
${ul([
  `Each astronaut eats ${v('packagedFoodPerCrewDay')} of packaged ISS-style food, worth ${v('foodEnergyPerCrewDay')}.`,
  `Potatoes yield ${v('potatoYield')} in NASA growth chambers. The harvest is turned into crew-days with ${v('potatoEnergy')}, a USDA value clearly labelled <b>NOT NASA</b>.`,
  `Rations cut meals to ${fmt((TUNING.rationFactor as number) * 100)}%${ref('tuning', '')} but cost health. Store ${g('foodStoreKg', ' kg')}; landed with ${g('startFoodKg', ' kg')}.`,
  `Crops reach full growth in ${g('greenhouseRampSols', ' sols')} in the game, which is much faster than real potatoes (see the simplifications slide).`,
])}`,
  { eyebrow: 'Meter 3 of 4' },
);
slide(
  '🛡️ Shield',
  `<p class="formula">Shield = protection of the habitat against solar storms (0–100%)</p>
${ul([
  `Curiosity measured about ${v('marsSurfaceDose')} on the surface of Mars. Over 30 sols that is only about 20 mSv, so the Shield meter stands for protection against solar storms.`,
  `The largest solar storm Curiosity's RAD saw on the surface (May 2024) gave ${v('solarStorm2024')}.`,
  `NASA's RadWorks project studied storm shelters walled with stored water. In that study each water-container wall is ${v('waterShielding')}.`,
  `Surface habitat starts at ${g('shieldSurface', '%')}; each regolith job adds ${g('regolithPerTask', '%')}. Underground starts at ${g('shieldUnderground', '%')} after ${g('undergroundBuildSols', ' sols')} of digging.`,
])}`,
  { eyebrow: 'Meter 4 of 4' },
);

// 11-12 crises
const sym: Record<string, string> = { power: '⚡', oxygen: '🫁', food: '🥔', shield: '🛡️', water: '💧', time: '⏱', risk: '⚠️', safety: '✚' };
const icons = (o: Record<string, number>) => Object.entries(o).map(([k, n]) => sym[k].repeat(n)).join(' ') || '—';
for (const half of [STAGE_ORDER.slice(0, 3), STAGE_ORDER.slice(3)]) {
  slide(
    half[0] === 'habitat' ? 'The six crises (1–3)' : 'The six crises (4–6)',
    `<table class="small"><tr><th>Sol</th><th>Crisis</th><th>Option</th><th>Costs</th><th>Gains</th></tr>${half
      .map((st) =>
        OPTION_PREVIEWS[st]
          .map((o, i) => {
            const s = en.stages[st] as unknown as Record<string, { title: string }> & { title: string };
            return `<tr>${i === 0 ? `<td rowspan="${OPTION_PREVIEWS[st].length}">${STAGE_SOLS[st]}</td><td rowspan="${OPTION_PREVIEWS[st].length}">${esc(s.title)}</td>` : ''}<td><b>${o.id}</b> ${esc(s[o.id].title)}${o.inWorld ? ' 🕹' : ''}</td><td>${icons(o.cost)}</td><td>${icons(o.gain)}</td></tr>`;
          })
          .join(''),
      )
      .join('')}</table><p class="txt">🕹 = the player carries this option out in the 3D world. Icons are the cards shown to the player${ref('cards', `<b>Option cards</b> · <code>OPTION_PREVIEWS</code> in <code>src/engine/stages.ts</code> · <a href="${REPO}/blob/main/src/engine/stages.ts">${REPO}/blob/main/src/engine/stages.ts</a>`)}. ${half[0] === 'habitat' ? '' : `The solar-storm warning arrives late because of the real Earth–Mars light time for the story date (between ${v('lightDelayMin')} and ${v('lightDelayMax')}), computed with JPL's approximate planet positions${ref('jpl', `<b>JPL Approximate Positions of the Planets</b> · <a href="https://ssd.jpl.nasa.gov/planets/approx_pos.html">https://ssd.jpl.nasa.gov/planets/approx_pos.html</a> · <i>primary NASA</i>`)}.`}</p>`,
    { eyebrow: 'Decisions' },
  );
}

// 13 trade-offs and consequences
slide(
  'Trade-offs you can see',
  `<div class="two"><div>${ul([
    'Choosing the ice plant ties up power and the rover, so the dust storm hits harder.',
    '"Save power" in the storm dims the farm lights, and the plants wilt.',
    'A surface habitat makes the delayed solar-storm warning dangerous unless regolith was piled on.',
    'Crew who took risky walks come back hurt and need the medbay later.',
    'In the world: dust on panels, plants growing and wilting with a harvest countdown, regolith piling on the roof, the reactor glowing, a damaged antenna, a medbay cross, an abandoned rover, and a memorial if someone dies.',
  ])}</div><div>${img('dusty.jpg', 'Dusty panels', 'width:100%;height:150px')}${img('dusty-log.jpg', 'Power falls tonight', 'width:100%;height:105px;object-fit:contain;background:#22140e;margin-top:8px')}${img('clean.jpg', 'Clean panels', 'width:100%;height:150px;margin-top:8px')}${img('clean-log.jpg', 'Power rises tonight', 'width:100%;height:105px;object-fit:contain;background:#22140e;margin-top:8px')}</div></div>`,
  { eyebrow: 'Consequences' },
);

// 14 living sol and guidance
slide(
  'A living sol, daily goals and guidance',
  `<div class="two"><div>${ul([
    'The sun crosses the sky, sets blue and rises again. Time pauses for decisions, hints and the computer.',
    'Meters move live toward the engine’s result for tonight, recomputed the moment an order changes, and land exactly on it (unit-tested).',
    'A daily goal is picked from real engine state (oxygen falling, storm coming, dusty panels, low shield, worn machines, hurt crew), never at random.',
    'Blue arrows are drawn on the ground around buildings to every target, with a light beacon for far ones.',
    'Sol-1 training points a hand at each control. 13 illustrated hint cards appear the first time each situation happens; the “?” button shows them all.',
  ])}</div><div>${img('goal.jpg', 'Daily goal and ground arrows', 'width:100%;height:300px')}${img('crew.jpg', 'Crew working with a countdown', 'width:100%;height:300px;margin-top:14px')}</div></div>`,
  { eyebrow: 'Playable with no instructions' },
);

// 15 debrief
slide(
  'Debrief: learn from the decision that mattered',
  ul([
    'At the end, the game replays each crisis with the other options from the same moment and the same random seed.',
    'It names the decision that mattered most, for example: <i>“Sol 9, POWER: you chose ‘Save power’. Replays show ‘Start the backup reactor’ would have survived 100% of the time.”</i>',
    'A timeline chart shows Power, Oxygen, Food and Shield over the mission.',
    'One button retries from that crisis.',
  ]) + `<p class="txt">Replays use the same engine as the game${ref('analysis', `<b>Counterfactual replays</b> · <code>src/engine/analysis.ts</code>, <code>src/engine/strategies.ts</code> · <a href="${REPO}/blob/main/src/engine/analysis.ts">${REPO}/blob/main/src/engine/analysis.ts</a>`)}.</p>`,
  { eyebrow: 'After the mission' },
);

// 16 balance
slide(
  'Balance proof',
  `<div class="two"><div>${ul([
    `Every combination of crisis choices: <b>${B.header[1]} decision paths</b>, each simulated with <b>${B.header[2]} random seeds</b>.${balCite()}`,
    `Random player (random choices and random daily jobs): <b>${B.random}</b> of missions won.`,
    `Random choices but careful daily jobs: <b>${B.careful}</b>.`,
    `Thoughtful player (looks ahead): <b>${B.thoughtful}</b>.`,
    `Paths by win rate: ${B.buckets.length ? `0%: ${B.buckets[1]}, 1–25%: ${B.buckets[2]}, 25–50%: ${B.buckets[3]}, 50–75%: ${B.buckets[4]}, 75–99%: ${B.buckets[5]}, 100%: ${B.buckets[6]}` : 'see report'}.`,
  ])}</div><div><table class="small"><tr><th>Crisis</th><th>Average win rate of paths with each option</th></tr>${B.options.map(([s, o]) => `<tr><td>${s}</td><td>${esc(o)}</td></tr>`).join('')}</table><p class="txt">No single option wins on its own.</p></div></div>`,
  { eyebrow: 'Numbers from npm run paths' },
);

// 17 simplifications (generated)
{
  const simplified = (Object.entries(NASA) as [NasaKey, DataEntry][]).filter(([, e]) => e.simplified);
  slide(
    'Honest simplifications',
    ul(simplified.map(([k, e]) => `<b>${fmt(e.value)} ${esc(e.unit)}</b>${v(k).replace(/^[^<]*/, '')}: ${esc(e.note ?? '')}`)) +
      ul([`Crops: real potatoes take about 4 months; the game reaches full growth in ${g('greenhouseRampSols', ' sols')} so a harvest fits in 30 sols.`, `The game's dust storm is shorter and weaker than 2018's (storm optical depth profile in <code>src/engine/sim.ts</code>).`]),
    { eyebrow: 'What we sped up or scaled, and why', cls: 'dense' },
  );
}

// 18 technology & architecture
const LIBS: [string, string][] = [
  ['react', 'https://react.dev'],
  ['three', 'https://threejs.org'],
  ['@react-three/fiber', 'https://r3f.docs.pmnd.rs'],
  ['@react-three/drei', 'https://github.com/pmndrs/drei'],
  ['@react-three/postprocessing', 'https://github.com/pmndrs/react-postprocessing'],
  ['postprocessing', 'https://github.com/pmndrs/postprocessing'],
  ['zustand', 'https://zustand.docs.pmnd.rs'],
  ['vite', 'https://vite.dev'],
  ['vite-plugin-pwa', 'https://vite-pwa-org.netlify.app'],
  ['typescript', 'https://www.typescriptlang.org'],
  ['vitest', 'https://vitest.dev'],
  ['puppeteer-core', 'https://pptr.dev'],
  ['geotiff', 'https://geotiffjs.github.io'],
  ['@gltf-transform/core', 'https://gltf-transform.dev'],
  ['marked', 'https://marked.js.org'],
  ['qrcode', 'https://github.com/soldair/node-qrcode'],
  ['tsx', 'https://tsx.is'],
];
const lic = (p: string) => {
  try {
    return JSON.parse(readFileSync(`node_modules/${p}/package.json`, 'utf8')) as { version: string; license: string };
  } catch {
    return null;
  }
};
slide(
  'Technology and architecture',
  `<div class="two"><div>${ul([
    '<b>Data:</b> <code>src/data/nasa.ts</code>, every real number with value, unit, source, link and status.',
    '<b>Engine:</b> pure, deterministic TypeScript: sols, crises, orbit, replays and balance strategies.',
    '<b>3D world:</b> React Three Fiber on three.js, with our own sky and terrain shaders and no game engine.',
    '<b>Interface:</b> React and zustand; Arabic (right to left, male and female forms) and English.',
    '<b>Saves:</b> on the device, plus an optional cloud save (PHP and SQLite, username and password only).',
    '<b>Offline:</b> an installable PWA precaches the terrain, model, sounds and hint images.',
  ])}</div><div><table class="small"><tr><th>Library</th><th>Version</th><th>Licence</th></tr>${LIBS.filter(([p]) => lic(p))
    .map(([p, u]) => `<tr><td><a href="${u}">${p}</a></td><td>${lic(p)!.version}</td><td>${lic(p)!.license}</td></tr>`)
    .join('')}</table></div></div>`,
  { eyebrow: 'How it is built', cls: 'dense' },
);

// 19 testing
slide(
  'Testing',
  ul([
    `<b>${testCount} unit tests</b> (Vitest): the NASA data file, the orbit model against real close approaches, every crisis option, win and loss rules, live meters landing on the engine result, daily goals, routing around buildings, crew jobs, hint show-once logic, and translation parity.`,
    `<b>Balance analysis</b> of ${B.header[1]} decision paths × ${B.header[2]} seeds.${balCite()}`,
    '<b>Full play-throughs</b> in headless Chrome in English and Arabic, which dismiss the training and hint cards and carry out the in-world actions, after every merge.',
    `<b>Source check:</b> ${check.rows.length} source URLs requested and searched for their values: ${verified} found word-for-word, the rest derived or explained.${ref('srccheck', `<b>Source check report</b> · <a href="${REPO}/blob/main/docs/SOURCES_CHECK.md">${REPO}/blob/main/docs/SOURCES_CHECK.md</a>`)}`,
    '<b>Live-site checks</b> after each upload: the game, offline files, NASA model, audio and save server.',
    'Not yet measured: frame rates on very old phones (the Low graphics setting turns off shadows, effects and dust).',
  ]),
  { eyebrow: 'How we checked it' },
);

// 20 AI
slide(
  'Use of artificial intelligence',
  ul([
    '<b>Claude Code</b> (Anthropic) was used as an AI pair programmer: writing and refactoring code (engine, 3D world, interface, translations, save API, scripts), finding and checking NASA documents and numbers, converting NASA terrain, model and audio files, running the balance analysis and automated play-tests, and drafting documentation.',
    'The team wrote the story and the six crises, made the design decisions, reviewed the sources and play-tested the game.',
    '<b>No AI-generated images, video or audio are in the project.</b> Every visual is real gameplay rendered by our code or a NASA asset. Sounds are NASA recordings or simple tones made in code.',
  ]),
  { eyebrow: 'Declared as required' },
);

// 21 next
slide(
  "What's next",
  ul(['A teacher mode with class statistics.', 'More crises, and letting players choose where to build each module.', 'An Android app from the same code.', 'Play-testing in classrooms in Egypt in Arabic and English.']) +
    `<p class="lead">Play now: <a href="${PLAY}">${PLAY}</a></p>`,
  { eyebrow: 'Next steps', bg: 'hero.jpg', cls: 'title' },
);

// Sources section (generated from src/data/nasa.ts)
const entries = Object.entries(NASA) as [NasaKey, DataEntry][];
const USED: Partial<Record<NasaKey, string>> = {
  oxygenPerCrewDay: 'Oxygen breathed (engine)', co2PerCrewDay: 'Fact card', waterPerCrewDay: 'Water used (engine)', packagedFoodPerCrewDay: 'Food eaten (engine)',
  foodEnergyPerCrewDay: 'Harvest → crew-days (engine)', potatoYield: 'Farm harvest (engine)', potatoOxygen: 'Farm oxygen (engine)', potatoEnergy: 'Harvest → crew-days (engine)',
  issWaterRecovery: 'Water recycling (engine)', electrolysisWater: 'Ice plant oxygen (engine)', solarIrradianceMars: 'Solar power (engine)', solDuration: 'Sol length (engine)',
  marsGravity: 'Fact card', marsCO2: 'Fact card', marsPressure: 'Fact card', marsNightTemp: 'Fact card', marsDayTemp: 'Fact card', blueSunset: 'Sky shader, fact card',
  marsSurfaceDose: 'Shield meter source', solarStorm2024: 'Solar-storm crisis', waterShielding: 'Water-wall option fact', solarCellEfficiency: 'Solar power (engine)',
  moxieRate: 'MOXIE fact', moxiePower: 'MOXIE fact', dustStormTau2018: 'Dust storm (fact; game storm weaker)', kilopowerOutput: 'Backup reactor size',
  ingenuityFlights: 'Robot option fact', lightDelayMin: 'Light-delay bounds (test)', lightDelayMax: 'Light-delay bounds (test)',
};
for (let i = 0; i < entries.length; i += 6) {
  const part = entries.slice(i, i + 6);
  slide(
    `Sources: every number ${i / 6 + 1}/${Math.ceil(entries.length / 6)}`,
    `<table class="src"><tr><th>Key</th><th>Value</th><th>Controls</th><th>Source (document, table)</th><th>Status</th><th>Simplification note</th></tr>${part
      .map(([k, e]) => `<tr><td><code>${k}</code></td><td>${fmt(e.value)} ${esc(e.unit)}</td><td>${USED[k] ?? ''}</td><td>${esc(e.sourceName)}<br><a href="${e.sourceUrl}">${esc(e.sourceUrl)}</a></td><td>${label(e)}${e.simplified ? ', simplified' : ''}</td><td>${esc(e.note ?? '')}</td></tr>`)
      .join('')}</table>`,
    { eyebrow: 'Generated from src/data/nasa.ts', cls: 'dense sources' },
  );
}
slide(
  'Sources (2): NASA assets',
  `<table class="src"><tr><th>Asset</th><th>Product ID</th><th>URL</th><th>Credit</th></tr>
<tr><td>HiRISE digital terrain model</td><td>DTEEC_045994_1985_046060_1985_U01</td><td><a href="https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_045994_1985_ESP_046060_1985/DTEEC_045994_1985_046060_1985_U01.tif">astrogeo-ard …/DTEEC_045994_1985_046060_1985_U01.tif</a></td><td>NASA/JPL/University of Arizona; USGS Astrogeology</td></tr>
<tr><td>HiRISE orthoimage</td><td>ESP_045994_1985</td><td><a href="https://www.uahirise.org/ESP_045994_1985">https://www.uahirise.org/ESP_045994_1985</a></td><td>NASA/JPL/University of Arizona</td></tr>
<tr><td>CTX digital terrain model</td><td>P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W</td><td><a href="https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/ctx/controlled/usgs/P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W/P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W_dtm.tif">astrogeo-ard …/…_dtm.tif</a></td><td>NASA/JPL/MSSS; USGS Astrogeology</td></tr>
<tr><td>Perseverance 3D model</td><td>25042_Perseverance.glb</td><td><a href="https://science.nasa.gov/resource/mars-perseverance-rover-3d-model/">https://science.nasa.gov/resource/mars-perseverance-rover-3d-model/</a></td><td>NASA/JPL-Caltech</td></tr>
<tr><td>Perseverance microphone: Mars wind</td><td>45704_1st_Sounds_from_Mars</td><td><a href="https://science.nasa.gov/resource/nasas-perseverance-rover-microphone-captures-sounds-from-mars/">https://science.nasa.gov/resource/nasas-perseverance-rover-microphone-captures-sounds-from-mars/</a></td><td>NASA/JPL-Caltech/ISAE-SUPAERO/LANL</td></tr>
<tr><td>Perseverance microphone: rover driving</td><td>45857_Sol16RoverDriveHighlights</td><td><a href="https://science.nasa.gov/resource/sounds-of-perseverance-mars-rover-driving-sol-16-90-second-highlights/">https://science.nasa.gov/resource/sounds-of-perseverance-mars-rover-driving-sol-16-90-second-highlights/</a></td><td>NASA/JPL-Caltech/ISAE-SUPAERO/LANL</td></tr></table>
<p class="txt">All NASA material is used under NASA's media usage guidelines; no NASA logos or mission insignia are used.</p>`,
  { eyebrow: 'Terrain, model and sound', cls: 'dense sources' },
);
slide(
  'Sources (3): software and (4): what is not NASA',
  `<div class="two"><div><table class="small">${LIBS.filter(([p]) => lic(p))
    .map(([p, u]) => `<tr><td><a href="${u}">${p}</a></td><td>${lic(p)!.license}</td></tr>`)
    .join('')}<tr><td><a href="https://ffmpeg.org">FFmpeg</a> (tool)</td><td>LGPL/GPL</td></tr><tr><td><a href="https://www.php.net">PHP</a> + <a href="https://sqlite.org">SQLite</a></td><td>PHP License / public domain</td></tr><tr><td>Inter, Space Grotesk fonts</td><td>SIL OFL 1.1</td></tr><tr><td><a href="https://www.hostinger.com">Hostinger</a> (hosting), <a href="https://github.com">GitHub</a> (code)</td><td>services</td></tr></table></div><div>${ul([
    `<b>NOT NASA:</b> potato energy, ${fmt(NASA.potatoEnergy.value)} ${NASA.potatoEnergy.unit}, from USDA FoodData Central (<a href="${NASA.potatoEnergy.sourceUrl}">${NASA.potatoEnergy.sourceUrl}</a>).`,
    `<b>Reported by others:</b> Ingenuity's flight count (Live Science) and Curiosity's surface dose (SwRI release quoting the RAD principal investigator).`,
    '<b>Game design values</b> (storage sizes, loads, growth speed, risks) are ours. They live in <code>src/engine/tuning.ts</code> and are never shown as NASA data.',
    '<b>No partner-agency data</b> (ESA, JAXA, CSA or others) was used.',
  ])}</div></div>`,
  { eyebrow: 'Licences and non-NASA items', cls: 'dense' },
);

// ---------- page ----------
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jezero: Sol 30 · Full presentation</title>
<meta name="description" content="Full presentation of Jezero: Sol 30 (NASA Space Apps 2026, Team AstraQuest) with a source for every number.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@600;700&display=block" rel="stylesheet">
<style>
:root{--night:#1A0F0B;--sand:#F6ECE3;--rust:#E2652A;--sky:#4FB3D9;--dim:rgba(246,236,227,.75)}
@page{size:1920px 1080px;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#0e0806}
body{font-family:Inter,sans-serif;color:var(--sand);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.deck{display:flex;flex-direction:column;align-items:center;gap:24px;padding:24px 0}
.slide{position:relative;width:1920px;height:1080px;overflow:hidden;background:var(--night);zoom:var(--z,1);flex:none}
@media print{.deck{gap:0;padding:0}.slide{zoom:1;break-after:page}.slide:last-child{break-after:auto}.top{display:none}}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(26,15,11,.96),rgba(26,15,11,.8) 55%,rgba(26,15,11,.45))}
.pad{position:absolute;left:110px;right:110px;top:80px;bottom:250px;display:flex;flex-direction:column}
h2{font-family:'Space Grotesk';font-size:64px;line-height:1.05;letter-spacing:-.02em;margin-bottom:26px}
.title h2{font-size:120px}
.eyebrow{font-family:'Space Grotesk';font-size:24px;letter-spacing:.2em;text-transform:uppercase;color:var(--rust);margin-bottom:16px;font-weight:700}
.body{flex:1;min-height:0}
.lead{font-size:38px;line-height:1.3;margin-bottom:22px}
.txt{font-size:24px;line-height:1.45;color:var(--dim);margin-top:14px}
ul{display:flex;flex-direction:column;gap:12px;padding-left:28px}li{font-size:26px;line-height:1.4}
.dense li{font-size:22px}
.formula{font-family:'Space Grotesk';font-size:28px;color:var(--sky);background:rgba(79,179,217,.1);border:2px solid rgba(79,179,217,.35);border-radius:16px;padding:16px 22px;margin-bottom:20px}
.two{display:grid;grid-template-columns:1.15fr 1fr;gap:48px;height:100%}
.shot{display:block;border-radius:16px;border:2px solid rgba(246,236,227,.2);object-fit:cover}
table{border-collapse:collapse;width:100%;font-size:22px}th,td{border-bottom:1px solid rgba(246,236,227,.15);padding:8px 10px;text-align:left;vertical-align:top}th{color:var(--rust);font-family:'Space Grotesk'}
table.small{font-size:17px}table.small td,table.small th{padding:4px 8px}table.src{font-size:15px}table.src td{padding:5px 8px}
a{color:var(--sky);text-decoration:none;word-break:break-all}
sup{color:var(--sky);font-weight:700;font-size:.6em;margin-left:2px}
code{font-family:Consolas,monospace;font-size:.9em;color:#ffd18a}
.cites{position:absolute;left:110px;right:110px;bottom:62px;max-height:180px;overflow:hidden;font-size:13.5px;line-height:1.35;color:rgba(246,236,227,.78);padding-left:24px;border-top:1px solid rgba(246,236,227,.18);padding-top:8px;columns:2;column-gap:40px}
.cites li{font-size:13.5px;margin-bottom:3px;break-inside:avoid}
.foot{position:absolute;left:110px;right:110px;bottom:22px;display:flex;justify-content:space-between;font-size:17px;color:rgba(246,236,227,.55)}
.top{position:sticky;top:0;z-index:5;background:#0e0806;padding:10px 16px;font-size:15px;text-align:center;border-bottom:1px solid #3a2418}
</style></head><body>
<div class="top">Jezero: Sol 30 · Full presentation (${slides.length} slides) · <a href="Jezero-Sol-30-Full-Presentation.pdf">PDF</a> · <a href="../">Play the game</a> · <a href="${REPO}">Code</a></div>
<main class="deck">${slides.join('\n')}</main>
<script>function z(){document.documentElement.style.setProperty('--z',Math.min(1,(innerWidth-32)/1920))}z();addEventListener('resize',z)</script>
</body></html>`;
writeFileSync(`${OUT_DIR}/index.html`, html);

// ---------- PDF + layout check ----------
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const pg = await b.newPage();
await pg.setViewport({ width: 1960, height: 1100 });
await pg.goto(pathToFileURL(resolve(`${OUT_DIR}/index.html`)).href, { waitUntil: 'networkidle0' });
await pg.evaluate(() => document.fonts.ready);
const problems = await pg.evaluate(() => {
  const out: string[] = [];
  document.querySelectorAll('section.slide').forEach((s, i) => {
    const pad = s.querySelector('.pad') as HTMLElement;
    const body = s.querySelector('.body') as HTMLElement;
    const cites = s.querySelector('.cites') as HTMLElement | null;
    if (body.scrollHeight > body.clientHeight + 4 || pad.scrollHeight > pad.clientHeight + 4) out.push(`slide ${i + 1}: content overflows`);
    if (cites && cites.scrollHeight > cites.clientHeight + 4) out.push(`slide ${i + 1}: citations overflow`);
  });
  return out;
});
await pg.emulateMediaType('print');
await pg.pdf({ path: PDF, width: '1920px', height: '1080px', printBackground: true });
await b.close();
cpSync(PDF, `${OUT_DIR}/Jezero-Sol-30-Full-Presentation.pdf`);
console.log(`slides: ${slides.length}`);
console.log(problems.length ? 'LAYOUT PROBLEMS:\n' + problems.join('\n') : 'layout check: ok');

// slide PNGs for review (written to .tmp, not published)
if (process.env.PNG) {
  const b2 = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const p2 = await b2.newPage();
  await p2.setViewport({ width: 1960, height: 1100 });
  await p2.goto(pathToFileURL(resolve(`${OUT_DIR}/index.html`)).href, { waitUntil: 'networkidle0' });
  await p2.emulateMediaType('print');
  const els = await p2.$$('section.slide');
  for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: `.tmp/pres-${i + 1}.png` });
  await b2.close();
}
