import { lightDelayMinutes, dateOfSol } from './orbit';
import { Rng } from './rng';
import { aliveCrew, meters, snapshot, setSettings, STAGE_SOLS } from './sim';
import { TUNING as T } from './tuning';
import type { ChoiceContext, GameState, OptionId, Role, StageId, StageOutcome } from './types';

/** What the decision cards show before choosing (shown with icons; the UI never reveals hidden odds). */
export interface OptionPreview {
  id: OptionId;
  cost: Partial<Record<'power' | 'oxygen' | 'food' | 'shield' | 'water' | 'time' | 'risk', 1 | 2 | 3>>;
  gain: Partial<Record<'power' | 'oxygen' | 'food' | 'shield' | 'water' | 'safety' | 'time', 1 | 2 | 3>>;
  /** The player must do something in the 3D world (walk somewhere, repair, run to shelter). */
  inWorld: boolean;
}

export const OPTION_PREVIEWS: Record<StageId, OptionPreview[]> = {
  habitat: [
    { id: 'A', cost: { shield: 2 }, gain: { time: 3, power: 1 }, inWorld: false },
    { id: 'B', cost: { power: 2, oxygen: 1, time: 2 }, gain: { shield: 3 }, inWorld: false },
  ],
  lifeSupport: [
    { id: 'A', cost: { power: 2, risk: 1 }, gain: { water: 3, oxygen: 2 }, inWorld: false },
    { id: 'B', cost: { power: 2, water: 1, time: 1 }, gain: { food: 3, oxygen: 1 }, inWorld: false },
    { id: 'C', cost: { power: 3 }, gain: { oxygen: 2 }, inWorld: false },
  ],
  power: [
    { id: 'A', cost: { oxygen: 1, risk: 2 }, gain: { power: 3 }, inWorld: true },
    { id: 'B', cost: { food: 1, oxygen: 1 }, gain: { power: 2 }, inWorld: false },
    { id: 'C', cost: { oxygen: 1, risk: 2 }, gain: { power: 1 }, inWorld: false },
  ],
  mobility: [
    { id: 'A', cost: { oxygen: 2, risk: 1 }, gain: { safety: 1 }, inWorld: true },
    { id: 'B', cost: { power: 2, risk: 1 }, gain: { safety: 2 }, inWorld: false },
    { id: 'C', cost: { water: 2 }, gain: { safety: 3 }, inWorld: false },
  ],
  communication: [
    { id: 'A', cost: { time: 2 }, gain: { safety: 3 }, inWorld: true },
    { id: 'B', cost: { shield: 2, risk: 3 }, gain: { time: 3 }, inWorld: false },
    { id: 'C', cost: { water: 3 }, gain: { safety: 2 }, inWorld: false },
  ],
  safety: [
    { id: 'A', cost: { power: 2, oxygen: 2 }, gain: { safety: 3 }, inWorld: false },
    { id: 'B', cost: { oxygen: 1 }, gain: { safety: 2 }, inWorld: false },
    { id: 'C', cost: { risk: 3 }, gain: {}, inWorld: false },
  ],
};

export function optionsFor(stage: StageId): OptionId[] {
  return OPTION_PREVIEWS[stage].map((o) => o.id);
}

/** Earth–Mars light delay on the communication sol, in minutes (real orbit for the story date). */
export function commsDelayMinutes(s: GameState): number {
  return lightDelayMinutes(dateOfSol(STAGE_SOLS.communication)) + (s.commsDamaged ? 6 : 0);
}
/** Earth spots the solar storm this many minutes before the particles reach Mars (game value). */
export const SPE_WARNING_MIN = 40;
/** Real-time seconds the player gets to reach the shelter in the 3D world. */
export function shelterSeconds(s: GameState): number {
  return Math.max(15, Math.round((SPE_WARNING_MIN - commsDelayMinutes(s)) * 3));
}

const pickPatient = (s: GameState): Role => {
  const candidates = aliveCrew(s).filter((c) => c.id !== 'commander');
  return candidates.reduce((a, b) => (b.health < a.health ? b : a)).id;
};

function injure(s: GameState, rng: Rng, who: Role[], amount: number, out: StageOutcome) {
  for (const id of who) {
    const c = s.crew.find((x) => x.id === id && x.alive);
    if (!c) continue;
    c.health = Math.max(0, c.health - amount);
    c.condition = 'injured';
    out.injured.push(id);
    if (c.health <= 0) {
      c.alive = false;
      out.deaths.push(id);
    }
  }
  void rng;
}

function sicken(s: GameState, who: Role[]) {
  for (const c of s.crew) if (c.alive && who.includes(c.id)) {
    c.condition = 'sick';
    c.radSols = 4;
  }
}

function doseAll(s: GameState, amountByRole: (r: Role) => number, out: StageOutcome) {
  for (const c of aliveCrew(s)) {
    const d = amountByRole(c.id);
    if (d <= 0) continue;
    c.health = Math.max(0, c.health - d);
    if (c.health <= 0) {
      c.alive = false;
      out.deaths.push(c.id);
    }
  }
}

/** Resolve the pending stage with the chosen option. Pure: returns a new state and what happened. */
export function chooseOption(prev: GameState, option: OptionId, ctx: ChoiceContext = {}): { state: GameState; outcome: StageOutcome } {
  const stage = prev.pendingStage;
  if (!stage) throw new Error('No stage is waiting for a decision');
  if (!optionsFor(stage).includes(option)) throw new Error(`Option ${option} is not available for ${stage}`);
  let s: GameState = structuredClone({ ...prev, history: [], stageLog: [] });
  const rng = new Rng(s.rng);
  const before = meters(prev);
  const out: StageOutcome = { stage, option, success: true, lines: [], delta: {}, factKey: stage, injured: [], deaths: [] };
  const line = (key: string, params?: Record<string, number | string>) => out.lines.push({ key: `${stage}.${option}.${key}`, params });
  const odds = (p: number) => (ctx.actionSucceeded === undefined ? rng.chance(p) : ctx.actionSucceeded);

  switch (stage) {
    case 'habitat': {
      if (option === 'A') {
        s.habitat = 'surface';
        s.shield = T.shieldSurface;
        line('result', { shield: T.shieldSurface });
        out.factKey = 'surfaceRadiation';
      } else {
        s.habitat = 'underground';
        s.buildSolsLeft = T.undergroundBuildSols;
        s.shield = T.shieldSurface;
        line('result', { sols: T.undergroundBuildSols, shield: T.shieldUnderground });
        if (rng.chance(0.12)) {
          injure(s, rng, ['geologist'], 30, out);
          line('caveIn');
        }
        out.factKey = 'regolithShield';
      }
      break;
    }
    case 'lifeSupport': {
      if (option === 'A') {
        s.lifeSupport = 'ice';
        s.roverAt = 'iceSite';
        s = setSettings(s, { icePlantOn: true });
        line('result');
        out.factKey = 'swimIce';
      } else if (option === 'B') {
        s.lifeSupport = 'greenhouse';
        s.greenhouseAge = 0;
        s.greenhouseHealth = 1;
        s = setSettings(s, { greenhouseOn: true });
        line('result', { sols: T.greenhouseRampSols });
        out.factKey = 'crops';
      } else {
        s.lifeSupport = 'moxie';
        s = setSettings(s, { moxieOn: true });
        line('result');
        out.factKey = 'moxie';
      }
      break;
    }
    case 'power': {
      s.storm = { day: 0, plan: option };
      if (option === 'A') {
        // Two crew walk through the storm to bring the standby reactor online.
        s.o2 -= 2 * T.evaO2PerPersonSol * 2;
        const engineer = s.crew.find((c) => c.id === 'engineer')!;
        const ok = odds(engineer.alive && engineer.health > 50 ? 0.8 : 0.45);
        out.success = ok;
        if (rng.chance(0.25)) injure(s, rng, ['engineer'], 35, out);
        if (ok) {
          s.reactorOn = true;
          line('success');
        } else line('fail');
        out.factKey = 'kilopower';
      } else if (option === 'B') {
        s = setSettings(s, { heatingLow: true });
        line('result');
        out.factKey = 'dustStorm2018';
      } else {
        line('result');
        out.factKey = 'dustStorm2018';
      }
      break;
    }
    case 'mobility': {
      s.rover = 'broken';
      const atCache = s.lifeSupport !== 'ice';
      s.roverAt = atCache ? 'cache' : 'iceSite';
      if (option === 'A') {
        s.o2 -= 2 * T.evaO2PerPersonSol * 3;
        doseAll(s, (r) => (r === 'geologist' || r === 'engineer' ? 6 : 0), out);
        if (rng.chance(0.15)) injure(s, rng, ['geologist'], 30, out);
        out.success = odds(0.9);
      } else if (option === 'B') {
        s.battery = Math.max(0, s.battery - T.loadRobotMission);
        out.success = odds(Math.max(0.35, 0.85 - s.wear / 200));
      } else {
        out.success = false;
      }
      if (out.success) {
        s.rover = 'ok';
        s.roverAt = 'base';
        if (atCache) {
          s.food = Math.min(T.foodStoreKg, s.food + 110);
          s.o2 = Math.min(T.o2TankKg, s.o2 + 25);
          line('cache');
        } else line('ice');
      } else {
        s.rover = 'lost';
        if (s.lifeSupport === 'ice') s = setSettings(s, { icePlantOn: false });
        line(option === 'C' ? 'abandon' : 'fail');
      }
      out.factKey = option === 'B' ? 'ingenuity' : 'rover';
      break;
    }
    case 'communication': {
      const delay = commsDelayMinutes(s);
      const shieldFactor = (sh: number) => Math.max(0, 1 - sh / 100);
      if (option === 'A') {
        const inTime = odds(0.85);
        out.success = inTime;
        // crew outside who do not make it in time get the full dose; the habitat shield cannot help them
        doseAll(s, (r) => (!inTime && (r === 'geologist' || r === 'engineer') ? 40 : 8 * shieldFactor(s.shield)), out);
        if (!inTime) sicken(s, ['geologist', 'engineer']);
        s.tasks = []; // the day is spent in the shelter
        line(inTime ? 'safe' : 'late', { delay: Math.round(delay) });
      } else if (option === 'B') {
        doseAll(s, (r) => (r === 'geologist' || r === 'engineer' ? 55 : 22 * shieldFactor(s.shield)), out);
        sicken(s, ['geologist', 'engineer']);
        s.shield = Math.max(0, s.shield - 10);
        line('result', { delay: Math.round(delay) });
      } else {
        const used = Math.min(150, s.water);
        s.water -= used;
        const eff = Math.min(100, s.shield + 40 * (used / 150));
        doseAll(s, () => 18 * shieldFactor(eff), out);
        line('result', { water: Math.round(used), delay: Math.round(delay) });
      }
      out.factKey = 'lightDelay';
      break;
    }
    case 'safety': {
      const patient = pickPatient(s);
      const p = s.crew.find((c) => c.id === patient)!;
      p.health = Math.min(p.health, 40);
      p.condition = 'sick';
      s.medical = { patient, treatment: option, solsLeft: 3 };
      line('result', { who: patient });
      out.factKey = option === 'A' ? 'oxygenNeed' : 'crisis';
      break;
    }
  }

  const after = meters(s);
  out.delta = {
    power: after.power - before.power,
    oxygen: after.oxygen - before.oxygen,
    food: after.food - before.food,
    shield: after.shield - before.shield,
  };
  s.rng = rng.state;
  s.choices = { ...prev.choices, [stage]: option };
  s.pendingStage = null;
  s.history = prev.history;
  s.stageLog = [...prev.stageLog, { stage, sol: prev.sol, option, before: snapshot(prev), outcome: out }];
  if (out.deaths.length > 0 || s.o2 <= 0) {
    s.o2 = Math.max(0, s.o2);
    s.status = 'lost';
    s.lossReason = 'crewLost';
  }
  return { state: s, outcome: out };
}
