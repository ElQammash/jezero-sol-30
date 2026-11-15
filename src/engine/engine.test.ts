import { describe, expect, it } from 'vitest';
import { NASA, type DataEntry } from '../data/nasa';
import { analyzeMission, retryFromStage } from './analysis';
import { earthMarsDistanceKm, lightDelayMinutes } from './orbit';
import { Rng } from './rng';
import { createMission, endSol, forecast, liveMeters, meters, PER_CREW, setSettings, setTasks, solarKWh, STAGE_ORDER, STAGE_SOLS, starsFor } from './sim';
import { chooseOption, commsDelayMinutes, optionsFor, shelterSeconds } from './stages';
import { carefulDay, fixedPath, lookAhead, playOut } from './strategies';
import { TUNING } from './tuning';
import type { GameState, OptionId } from './types';

/** Advance to the next pending stage (or the end), using the careful daily routine. */
function toNextStage(s: GameState): GameState {
  while (s.status === 'playing' && !s.pendingStage) s = endSol(carefulDay(s));
  return s;
}
function choose(s: GameState, o: OptionId, success?: boolean) {
  return chooseOption(s, o, success === undefined ? {} : { actionSucceeded: success }).state;
}

describe('NASA data file', () => {
  it('has a value, unit, source and https link for every number', () => {
    for (const [k, e] of Object.entries(NASA as Record<string, DataEntry>)) {
      expect(Number.isFinite(e.value), k).toBe(true);
      expect(e.unit, k).not.toBe('');
      expect(e.sourceUrl, k).toMatch(/^https:\/\//);
    }
  });
  it('explains every simplified number and labels non-NASA sources', () => {
    for (const [k, e] of Object.entries(NASA as Record<string, DataEntry>)) {
      if (e.simplified) expect(e.note, k).toBeTruthy();
      if (!e.nasa) expect(e.sourceName, k).toMatch(/NOT NASA/);
    }
  });
  it('scales BVAD daily needs to a 24 h 39 min sol', () => {
    expect(PER_CREW.o2).toBeCloseTo(0.816 * (24.6597 / 24), 5);
    expect(PER_CREW.food).toBeCloseTo(1.83 * (24.6597 / 24), 5);
  });
});

describe('Earth–Mars light delay (JPL approximate positions)', () => {
  it('matches known close approaches and a conjunction', () => {
    expect(earthMarsDistanceKm(new Date('2003-08-27')) / 1e6).toBeCloseTo(55.8, 0);
    expect(earthMarsDistanceKm(new Date('2018-07-31')) / 1e6).toBeCloseTo(57.6, 0);
    expect(lightDelayMinutes(new Date('2021-10-08'))).toBeGreaterThan(20);
  });
  it('stays inside NASA’s 3–22.4 minute range during the mission', () => {
    const s = createMission(1);
    const d = commsDelayMinutes(s);
    expect(d).toBeGreaterThanOrEqual(NASA.lightDelayMin.value);
    expect(d).toBeLessThanOrEqual(NASA.lightDelayMax.value);
    expect(shelterSeconds(s)).toBeGreaterThanOrEqual(15);
  });
});

describe('mission flow', () => {
  it('asks the six stages in order on their sols', () => {
    let s = createMission(3);
    const seen: string[] = [];
    while (s.status === 'playing') {
      if (s.pendingStage) {
        expect(s.sol).toBe(STAGE_SOLS[s.pendingStage]);
        seen.push(s.pendingStage);
        s = choose(s, optionsFor(s.pendingStage)[0]);
      } else s = endSol(carefulDay(s));
    }
    if (s.status === 'won') expect(seen).toEqual(STAGE_ORDER);
  });
  it('refuses to end a sol while a decision is waiting', () => {
    expect(() => endSol(createMission(1))).toThrow();
  });
  it('is deterministic for the same seed and choices', () => {
    const a = playOut(createMission(42), fixedPath(['B', 'A', 'A', 'B', 'A', 'B']), carefulDay);
    const b = playOut(createMission(42), fixedPath(['B', 'A', 'A', 'B', 'A', 'B']), carefulDay);
    expect(a.history.map((h) => h.meters)).toEqual(b.history.map((h) => h.meters));
  });
});

describe('stage 1: habitat', () => {
  it('underground takes 3 sols of digging, then the shield jumps to 90', () => {
    let s = choose(createMission(5), 'B');
    expect(s.shield).toBe(TUNING.shieldSurface);
    for (let i = 0; i < 3; i++) s = endSol(setTasks(s, []));
    expect(s.shield).toBe(TUNING.shieldUnderground);
  });
  it('digging in costs extra power and oxygen compared with the surface', () => {
    const surface = endSol(setTasks(choose(createMission(5), 'A'), []));
    const under = endSol(setTasks(choose(createMission(5), 'B'), []));
    expect(under.o2).toBeLessThan(surface.o2);
    expect(under.battery).toBeLessThanOrEqual(surface.battery);
  });
  it('piling regolith raises the shield of a surface habitat', () => {
    const s = choose(createMission(5), 'A');
    const after = endSol(setTasks(s, ['pileRegolith']));
    expect(after.shield).toBe(s.shield + TUNING.regolithPerTask);
  });
});

describe('stage 2: life support', () => {
  const atStage2 = (seed: number) => toNextStage(choose(createMission(seed), 'A'));
  it('MOXIE makes oxygen but draws a lot of power', () => {
    const s = choose(atStage2(7), 'C');
    expect(forecast(s).demand.moxie).toBe(TUNING.loadMoxie);
    const next = endSol(setTasks(s, []));
    expect(next.history.at(-1)!.produced.o2).toBeGreaterThan(0);
  });
  it('the greenhouse starts slow and grows over several sols', () => {
    let s = choose(atStage2(7), 'B');
    s = endSol(setTasks(s, ['tendGreenhouse']));
    const first = s.history.at(-1)!.produced.food;
    for (let i = 0; i < 6; i++) s = s.pendingStage ? s : endSol(setTasks(s, ['tendGreenhouse']));
    expect(s.history.at(-1)!.produced.food).toBeGreaterThan(first);
  });
  it('an untended greenhouse wilts', () => {
    let s = choose(atStage2(7), 'B');
    for (let i = 0; i < 4; i++) s = endSol(setTasks(s, ['rest']));
    expect(s.greenhouseHealth).toBeLessThan(0.7);
  });
});

describe('stage 3: dust storm', () => {
  it('dust cuts solar power to a small fraction', () => {
    const s = createMission(1);
    const stormy = { ...s, storm: { day: 1, plan: 'B' as const } };
    expect(solarKWh(stormy)).toBeLessThan(solarKWh(s) * 0.2);
  });
  it('starting the reactor adds power for the rest of the mission', () => {
    let s = toNextStage(choose(toNextStage(choose(createMission(11), 'A')), 'C'));
    expect(s.pendingStage).toBe('power');
    s = choose(s, 'A', true);
    expect(s.reactorOn).toBe(true);
    expect(forecast(s).reactor).toBe(TUNING.reactorKWhPerSol);
  });
  it('shedding load turns the heating down', () => {
    let s = toNextStage(choose(toNextStage(choose(createMission(11), 'A')), 'C'));
    s = choose(s, 'B');
    expect(s.settings.heatingLow).toBe(true);
  });
});

describe('stages 4–6', () => {
  const until = (path: OptionId[], stage: string, seed = 21) => {
    let s = createMission(seed);
    let i = 0;
    while (s.status === 'playing' && s.pendingStage !== stage) {
      if (s.pendingStage) s = choose(s, path[i++], true);
      else s = endSol(carefulDay(s));
    }
    return s;
  };
  it('abandoning the rover stops the ice plant for good', () => {
    const s = choose(until(['B', 'A', 'A'], 'mobility'), 'C');
    expect(s.rover).toBe('lost');
    expect(s.settings.icePlantOn).toBe(false);
    expect(setSettings(s, { icePlantOn: true }).settings.icePlantOn).toBe(false);
  });
  it('a successful repair trip to the supply cache brings food and oxygen', () => {
    const s0 = until(['B', 'C', 'B'], 'mobility');
    const s = choose(s0, 'A', true);
    expect(s.food).toBeGreaterThan(s0.food);
    expect(s.rover).toBe('ok');
  });
  it('working through the solar storm hurts the crew outside more than sheltering', () => {
    const s0 = until(['A', 'C', 'B', 'B'], 'communication');
    const work = choose(s0, 'B');
    const shelter = choose(s0, 'A', true);
    const eng = (s: GameState) => s.crew.find((c) => c.id === 'engineer')!.health;
    expect(eng(work)).toBeLessThan(eng(shelter));
  });
  it('the water wall uses stored water', () => {
    const s0 = until(['B', 'A', 'B', 'B'], 'communication');
    expect(choose(s0, 'C').water).toBeLessThan(s0.water);
  });
  it('the medbay treats the patient using power and oxygen', () => {
    const s0 = until(['B', 'C', 'B', 'B', 'A'], 'safety');
    const s = choose(s0, 'A');
    expect(s.medical?.treatment).toBe('A');
    expect(forecast(s).demand.medbay).toBe(TUNING.loadMedbay);
  });
});

describe('winning and losing', () => {
  it('running out of oxygen loses the whole crew', () => {
    let s = choose(createMission(2), 'A');
    s = { ...s, o2: 1 };
    s = endSol(setTasks(s, []));
    expect(s.status).toBe('lost');
    expect(s.lossReason).toBe('oxygen');
  });
  it('a careful player who looks ahead can win and earn stars', () => {
    const s = playOut(createMission(5000), lookAhead(4), carefulDay);
    expect(s.status).toBe('won');
    expect(s.crew.every((c) => c.alive)).toBe(true);
    expect(s.shield).toBeGreaterThan(50);
    expect(starsFor(s)).toBeGreaterThanOrEqual(1);
  });
  it('the shield must stay above 50% to win', () => {
    let s = createMission(8);
    s = playOut(s, fixedPath(['A', 'C', 'B', 'B', 'A', 'B']), (x) => setSettings(setTasks(x, ['rest']), {}));
    if (s.status === 'lost' && s.lossReason === 'shieldLow') expect(meters(s).shield).toBeLessThanOrEqual(50);
  });
  it('the debrief replays other choices and can retry from a stage', () => {
    const rng = new Rng(9);
    const s = playOut(createMission(99), (_x, st) => rng.pick(optionsFor(st)), carefulDay);
    const d = analyzeMission(s, 4);
    expect(d.reviews.length).toBe(s.stageLog.length);
    if (d.decisive) {
      const r = retryFromStage(s, d.decisive.stage);
      expect(r.pendingStage).toBe(d.decisive.stage);
      expect(r.status).toBe('playing');
    }
  });
});

describe('live sol meters', () => {
  it('start at the current meters and land exactly on the endSol() result', () => {
    let s = toNextStage(createMission(7));
    s = choose(s, 'A');
    for (let i = 0; i < 12 && s.status === 'playing'; i++) {
      if (s.pendingStage) s = choose(s, 'B', true);
      if (s.status !== 'playing') break;
      s = carefulDay(s);
      expect(liveMeters(s, 0)).toEqual(meters(s));
      const next = endSol(s);
      expect(liveMeters(s, 1)).toEqual(meters(next));
      const mid = liveMeters(s, 0.5);
      for (const k of ['power', 'oxygen', 'food', 'shield'] as const) {
        expect(mid[k]).toBeGreaterThanOrEqual(Math.min(meters(s)[k], meters(next)[k]));
        expect(mid[k]).toBeLessThanOrEqual(Math.max(meters(s)[k], meters(next)[k]));
      }
      s = next;
    }
  });
  it('react at once to a change of orders', () => {
    const s = endSol(choose(toNextStage(createMission(3)), 'A'));
    const on = liveMeters(setSettings(s, { heatingLow: false }), 1);
    const off = liveMeters(setSettings(s, { heatingLow: true }), 1);
    expect(off.power).toBeGreaterThanOrEqual(on.power);
  });
});
