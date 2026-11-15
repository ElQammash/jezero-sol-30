/**
 * Balance analysis.
 *  - every one of the 729 stage-decision paths (3^6; habitat has 2 options so 486 real paths), each played
 *    with the careful daily routine over many seeds
 *  - a random player (random decisions + random daily tasks)
 *  - a thoughtful player (looks ahead before each decision)
 * Usage: npm run paths -- [seedsPerPath=60] [--json out.json]
 */
import { writeFileSync } from 'node:fs';
import { createMission, starsFor, STAGE_ORDER } from '../src/engine/sim';
import { optionsFor } from '../src/engine/stages';
import { Rng } from '../src/engine/rng';
import { carefulDay, fixedPath, lookAhead, playOut, randomChooser, randomDay } from '../src/engine/strategies';
import type { GameState, LossReason, OptionId } from '../src/engine/types';

const SEEDS = Number(process.argv[2]) || 60;
const jsonIdx = process.argv.indexOf('--json');
const seed = (i: number) => 7000 + i * 104729;

function allPaths(): OptionId[][] {
  let paths: OptionId[][] = [[]];
  for (const stage of STAGE_ORDER) paths = paths.flatMap((p) => optionsFor(stage).map((o) => [...p, o]));
  return paths;
}

interface Tally { wins: number; n: number; stars: number; losses: Record<LossReason, number>; endSol: number }
const tally = (): Tally => ({ wins: 0, n: 0, stars: 0, losses: { oxygen: 0, crewLost: 0, shieldLow: 0, colonyDark: 0 }, endSol: 0 });
function add(t: Tally, s: GameState) {
  t.n++;
  t.endSol += s.sol;
  if (s.status === 'won') {
    t.wins++;
    t.stars += starsFor(s);
  } else if (s.lossReason) t.losses[s.lossReason]++;
}
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

const t0 = Date.now();
// ---- every path ----
const paths = allPaths();
const pathResults = paths.map((path) => {
  const t = tally();
  for (let i = 0; i < SEEDS; i++) add(t, playOut(createMission(seed(i)), fixedPath(path), carefulDay));
  return { path: path.join(''), winRate: t.wins / t.n, t };
});
pathResults.sort((a, b) => b.winRate - a.winRate);

// ---- per-stage option averages (does any option dominate?) ----
const optionAvg: Record<string, Record<string, number>> = {};
STAGE_ORDER.forEach((stage, i) => {
  optionAvg[stage] = {};
  for (const o of optionsFor(stage)) {
    const sub = pathResults.filter((r) => r.path[i] === o);
    optionAvg[stage][o] = sub.reduce((a, r) => a + r.winRate, 0) / sub.length;
  }
});

// ---- random and thoughtful players ----
const random = tally();
for (let i = 0; i < 2000; i++) {
  const rng = new Rng(seed(i) ^ 0xabcdef);
  add(random, playOut(createMission(seed(i)), randomChooser(rng), randomDay(rng)));
}
const randomChoicesCarefulDays = tally();
for (let i = 0; i < 2000; i++) {
  const rng = new Rng(seed(i) ^ 0x1234);
  add(randomChoicesCarefulDays, playOut(createMission(seed(i)), randomChooser(rng), carefulDay));
}
const thoughtful = tally();
const thoughtfulN = Math.max(60, Math.round(SEEDS * 2));
for (let i = 0; i < thoughtfulN; i++) add(thoughtful, playOut(createMission(seed(i + 50000)), lookAhead(6), carefulDay));

// ---- report ----
const winRates = pathResults.map((r) => r.winRate);
const bucket = (lo: number, hi: number) => winRates.filter((w) => w >= lo && w < hi).length;
console.log(`\nJezero: Sol 30 balance report (${paths.length} decision paths x ${SEEDS} seeds, ${((Date.now() - t0) / 1000).toFixed(0)} s)\n`);
console.log('Players');
const row = (name: string, t: Tally) =>
  console.log(
    `  ${name.padEnd(34)} win ${pct(t.wins / t.n).padStart(6)}  avg stars ${(t.wins ? t.stars / t.wins : 0).toFixed(2)}  losses: O2 ${pct(t.losses.oxygen / t.n)}, crew ${pct(t.losses.crewLost / t.n)}, shield ${pct(t.losses.shieldLow / t.n)}`,
  );
row('random (choices + daily tasks)', random);
row('random choices, careful daily tasks', randomChoicesCarefulDays);
row(`thoughtful (looks ahead), n=${thoughtfulN}`, thoughtful);
console.log('\nDecision paths by win rate');
console.log(`  0%: ${winRates.filter((w) => w === 0).length}   1-25%: ${bucket(0.0001, 0.25)}   25-50%: ${bucket(0.25, 0.5)}   50-75%: ${bucket(0.5, 0.75)}   75-99%: ${bucket(0.75, 1)}   100%: ${winRates.filter((w) => w === 1).length}`);
console.log('  best 8: ' + pathResults.slice(0, 8).map((r) => `${r.path} ${pct(r.winRate)}`).join(', '));
console.log('  worst 5: ' + pathResults.slice(-5).map((r) => `${r.path} ${pct(r.winRate)}`).join(', '));
console.log('\nAverage win rate of paths containing each option (no option should win alone)');
for (const stage of STAGE_ORDER) console.log(`  ${stage.padEnd(14)} ` + Object.entries(optionAvg[stage]).map(([o, w]) => `${o}: ${pct(w)}`).join('   '));

if (jsonIdx > 0) {
  writeFileSync(
    process.argv[jsonIdx + 1],
    JSON.stringify({ seedsPerPath: SEEDS, random, randomChoicesCarefulDays, thoughtful, optionAvg, paths: pathResults.map((r) => ({ path: r.path, winRate: r.winRate })) }, null, 2),
  );
}
