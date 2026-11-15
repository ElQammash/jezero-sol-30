/**
 * Bot players for balance analysis, tests and the debrief's "what if" replays.
 * Bots only use what the HUD shows (meters, forecast, crew health), never future events.
 */
import { Rng } from './rng';
import { availableTasks, endSol, forecast, setSettings, setTasks, solsLeft, STAGE_ORDER } from './sim';
import { chooseOption, optionsFor } from './stages';
import { TUNING as T } from './tuning';
import type { GameState, OptionId, StageId, Task } from './types';

export type Chooser = (s: GameState, stage: StageId) => OptionId;
export type DailyPolicy = (s: GameState) => GameState;

/** A careful daily routine: what a thoughtful player does between crises. */
export const carefulDay: DailyPolicy = (s) => {
  const avgHealth = s.crew.filter((c) => c.alive).reduce((a, c) => a + c.health, 0) / Math.max(1, s.crew.filter((c) => c.alive).length);
  const want: Task[] = [];
  const can = availableTasks(s);
  if (can.includes('tendGreenhouse')) want.push('tendGreenhouse');
  if (avgHealth < 65 || s.crew.some((c) => c.alive && c.health < 45)) want.push('rest');
  if (can.includes('pileRegolith') && s.shield < 80 && !s.storm) want.push('pileRegolith');
  if (s.panelClean < 0.8 && !s.storm) want.push('cleanPanels');
  if (s.wear > 40) want.push('maintain');
  want.push('cleanPanels', 'maintain');
  let next = setTasks(s, want);
  const remaining = T.sols - s.sol + 1;
  const left = solsLeft(s);
  const fc = forecast(next);
  next = setSettings(next, {
    rations: left.food < remaining * 1.05,
    heatingLow: fc.net < 0 && next.battery < 140,
  });
  return next;
};

/** A careless routine: random tasks, never touches the settings. */
export function randomDay(rng: Rng): DailyPolicy {
  return (s) => {
    const can = availableTasks(s);
    return setTasks(s, [rng.pick(can), rng.pick(can)]);
  };
}

/** Simple rules of thumb (used inside look-ahead rollouts). */
export const ruleOfThumb: Chooser = (s, stage) => {
  switch (stage) {
    case 'habitat':
      return 'B';
    case 'lifeSupport':
      return 'B';
    case 'power':
      return s.crew.find((c) => c.id === 'engineer')!.health > 60 ? 'A' : 'B';
    case 'mobility':
      return s.wear < 40 ? 'B' : 'A';
    case 'communication':
      return s.water > 300 ? 'C' : 'A';
    case 'safety':
      return s.o2 > 60 && s.battery > 120 ? 'A' : 'B';
  }
};

export function randomChooser(rng: Rng): Chooser {
  return (_s, stage) => rng.pick(optionsFor(stage));
}

export function fixedPath(path: OptionId[]): Chooser {
  return (_s, stage) => {
    const opts = optionsFor(stage);
    const o = path[STAGE_ORDER.indexOf(stage)];
    return opts.includes(o) ? o : opts[0];
  };
}

/** Play a mission to the end. In-world actions succeed with the engine's own odds. */
export function playOut(start: GameState, choose: Chooser, day: DailyPolicy, maxSteps = 200): GameState {
  let s = start;
  for (let i = 0; i < maxSteps && s.status === 'playing'; i++) {
    if (s.pendingStage) s = chooseOption(s, choose(s, s.pendingStage)).state;
    else s = endSol(day(s));
  }
  return s;
}

/** Re-seed a state so look-ahead rollouts see different luck. */
export function reseed(s: GameState, k: number): GameState {
  return { ...s, rng: (s.rng ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0 };
}

export interface RolloutScore {
  option: OptionId;
  winRate: number;
  avgSol: number;
}

/** Try each option of the pending stage several times and score the results. */
export function scoreOptions(s: GameState, rollouts = 8, future: Chooser = ruleOfThumb, day: DailyPolicy = carefulDay): RolloutScore[] {
  const stage = s.pendingStage!;
  return optionsFor(stage).map((option) => {
    let wins = 0;
    let solSum = 0;
    for (let k = 0; k < rollouts; k++) {
      const start = reseed(s, k);
      const after = chooseOption(start, option).state;
      const end = playOut(after, future, day);
      if (end.status === 'won') wins++;
      solSum += end.sol;
    }
    return { option, winRate: wins / rollouts, avgSol: solSum / rollouts };
  });
}

/** A thoughtful player: looks ahead before each decision. */
export function lookAhead(rollouts = 8): Chooser {
  return (s) => {
    const scores = scoreOptions(s, rollouts);
    scores.sort((a, b) => b.winRate - a.winRate || b.avgSol - a.avgSol);
    return scores[0].option;
  };
}
