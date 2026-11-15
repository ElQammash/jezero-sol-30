import { NASA } from '../data/nasa';
import { Rng } from './rng';
import { TUNING as T } from './tuning';
import {
  ROLES,
  type Cause,
  type CrewMember,
  type FailureKind,
  type GameState,
  type Meters,
  type MinorEvent,
  type Role,
  type Settings,
  type SolRecord,
  type StageId,
  type Task,
} from './types';

export const SOL_DAYS = NASA.solDuration.value / 24; // one sol in Earth days (1.0275)

/** Per-sol needs of one crewmember, from NASA BVAD scaled to a sol. */
export const PER_CREW = {
  o2: NASA.oxygenPerCrewDay.value * SOL_DAYS,
  water: NASA.waterPerCrewDay.value * SOL_DAYS,
  food: NASA.packagedFoodPerCrewDay.value * SOL_DAYS,
};

/** Stage schedule: the sol on which each crisis begins. */
export const STAGE_SOLS: Record<StageId, number> = {
  habitat: 1,
  lifeSupport: 4,
  power: 9,
  mobility: 14,
  communication: 20,
  safety: 26,
};
export const STAGE_ORDER: StageId[] = ['habitat', 'lifeSupport', 'power', 'mobility', 'communication', 'safety'];

/** Dust optical depth during the storm (game profile, a shorter 2018-style storm). */
export const STORM_TAU = [3, 6, 5, 2.5];

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function stageForSol(sol: number): StageId | null {
  return STAGE_ORDER.find((s) => STAGE_SOLS[s] === sol) ?? null;
}

export function aliveCrew(s: GameState): CrewMember[] {
  return s.crew.filter((c) => c.alive);
}

export function createMission(seed: number): GameState {
  return {
    seed,
    rng: seed >>> 0,
    sol: 1,
    pendingStage: 'habitat',
    battery: T.batteryKWh,
    o2: T.startO2Kg,
    food: T.startFoodKg,
    water: T.startWaterKg,
    shield: T.shieldSurface,
    panelClean: 1,
    wear: 0,
    habitat: null,
    buildSolsLeft: 0,
    lifeSupport: null,
    greenhouseAge: 0,
    greenhouseHealth: 1,
    rover: 'ok',
    roverAt: 'base',
    reactorOn: false,
    storm: null,
    stormDone: false,
    commsDamaged: false,
    medical: null,
    crew: ROLES.map((id) => ({ id, health: 100, alive: true, condition: 'ok' })),
    settings: { rations: false, heatingLow: false, greenhouseOn: false, icePlantOn: false, moxieOn: false },
    tasks: [],
    choices: {},
    history: [],
    stageLog: [],
    status: 'playing',
    lossReason: null,
  };
}

export function meters(s: GameState): Meters {
  return {
    power: Math.round((s.battery / T.batteryKWh) * 100),
    oxygen: Math.round(clamp((s.o2 / T.o2TankKg) * 100, 0, 100)),
    food: Math.round(clamp((s.food / T.foodStoreKg) * 100, 0, 100)),
    shield: Math.round(s.shield),
  };
}

/** How many sols the stores last at current use, for the HUD ("≈ 12 sols"). */
/** The engine result of the current sol (what endSol() will give with the current orders). */
export function solPreview(s: GameState): GameState | null {
  if (s.status !== 'playing' || s.pendingStage) return null;
  return endSol(s);
}

/**
 * Meters part-way through a sol (t = 0..1): they move from the current values to the
 * engine result for this sol, so the HUD reacts at once to orders and lands exactly
 * on endSol() when the sol ends.
 */
export function liveMeters(s: GameState, t: number, preview: GameState | null = solPreview(s)): Meters {
  const a = meters(s);
  if (!preview) return a;
  const b = meters(preview);
  const f = clamp(t, 0, 1);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * f);
  return { power: mix(a.power, b.power), oxygen: mix(a.oxygen, b.oxygen), food: mix(a.food, b.food), shield: mix(a.shield, b.shield) };
}

export function solsLeft(s: GameState) {
  const n = aliveCrew(s).length || 1;
  return {
    oxygen: s.o2 / (n * PER_CREW.o2),
    food: s.food / (n * PER_CREW.food * (s.settings.rations ? T.rationFactor : 1)),
  };
}

export function snapshot(s: GameState): GameState {
  return structuredClone({ ...s, history: [], stageLog: [] });
}

export function availableTasks(s: GameState): Task[] {
  const t: Task[] = ['cleanPanels', 'maintain', 'rest'];
  if (s.habitat === 'surface') t.splice(1, 0, 'pileRegolith');
  if (s.lifeSupport === 'greenhouse') t.unshift('tendGreenhouse');
  return t;
}

export function setTasks(s: GameState, tasks: Task[]): GameState {
  const allowed = availableTasks(s);
  const clean = [...new Set(tasks)].filter((t) => allowed.includes(t)).slice(0, T.tasksPerSol);
  return { ...s, tasks: clean };
}

export function setSettings(s: GameState, patch: Partial<Settings>): GameState {
  const next = { ...s.settings, ...patch };
  // machines you do not have cannot be switched on
  if (s.lifeSupport !== 'greenhouse') next.greenhouseOn = false;
  if (s.lifeSupport !== 'ice' || s.rover === 'lost') next.icePlantOn = false;
  if (s.lifeSupport !== 'moxie') next.moxieOn = false;
  return { ...s, settings: next };
}

/** Electrical demand of the base for one sol with the current settings (kWh). */
export function powerDemand(s: GameState): Record<string, number> {
  const shed = s.storm?.plan === 'B';
  const heat = s.habitat === 'underground' && s.buildSolsLeft === 0 ? T.loadHeating.underground : T.loadHeating.surface;
  return {
    lifeSupport: T.loadLifeSupport,
    heating: heat * (s.settings.heatingLow || shed ? T.loadHeatingLow : 1),
    excavator: s.buildSolsLeft > 0 ? T.loadExcavator : 0,
    greenhouse: s.settings.greenhouseOn ? T.loadGreenhouse * (shed ? 0.3 : 1) : 0,
    icePlant: s.settings.icePlantOn && s.rover === 'ok' && !shed ? T.loadIcePlant : 0,
    moxie: s.settings.moxieOn ? T.loadMoxie : 0,
    medbay: s.medical?.treatment === 'A' && s.medical.solsLeft > 0 ? T.loadMedbay : 0,
  };
}

export function stormTau(s: GameState): number {
  return s.storm ? STORM_TAU[s.storm.day] ?? T.normalTau : T.normalTau;
}

export function solarKWh(s: GameState, failure: FailureKind | null = null): number {
  const tau = stormTau(s);
  const cleanBoost = s.storm?.plan === 'C' ? 1.5 : 1;
  const panelClean = s.storm?.plan === 'C' ? 1 : s.panelClean;
  const kwh =
    (T.panelAreaM2 * NASA.solarIrradianceMars.value * NASA.solarCellEfficiency.value * T.solarDayFactor * NASA.solDuration.value *
      Math.exp(-tau * T.dustExtinction) * panelClean * cleanBoost) /
    1000;
  return failure === 'panelFault' ? kwh * 0.7 : kwh;
}

/** Full forecast for the HUD: production vs demand for this sol. */
export function forecast(s: GameState) {
  const demand = powerDemand(s);
  const totalDemand = Object.values(demand).reduce((a, b) => a + b, 0);
  const solar = solarKWh(s);
  const reactor = s.reactorOn ? T.reactorKWhPerSol : 0;
  return { demand, totalDemand, solar, reactor, net: solar + reactor - totalDemand, tau: stormTau(s) };
}

function greenhouseGrowth(s: GameState): number {
  return Math.min(1, s.greenhouseAge / T.greenhouseRampSols) * s.greenhouseHealth;
}

/** Simulate one sol with the current tasks and settings. */
export function endSol(prev: GameState): GameState {
  if (prev.status !== 'playing') throw new Error('Mission is over');
  if (prev.pendingStage) throw new Error(`Resolve stage ${prev.pendingStage} first`);
  const s: GameState = structuredClone({ ...prev, history: [], stageLog: [] });
  const rng = new Rng(s.rng);
  const causes: Cause[] = [];
  const alive = () => s.crew.filter((c) => c.alive);
  const tasks = [...s.tasks];
  const before = snapshot(prev);

  // ---- random failures and small events ----
  let failure: FailureKind | null = null;
  if (rng.chance(s.wear * T.failureWearFactor)) {
    const kinds: FailureKind[] = ['panelFault', 'waterLeak', 'scrubberHiccup'];
    if (s.settings.moxieOn) kinds.push('moxieFault', 'moxieFault');
    failure = rng.pick(kinds);
  }
  let minor: MinorEvent = null;
  if (rng.chance(T.minorEventChance)) minor = rng.pick(['dustDevil', 'smallLeak', 'co2Spike', 'goodHarvest'] as const);
  if (minor === 'goodHarvest' && s.lifeSupport !== 'greenhouse') minor = null;

  // ---- tasks done this sol ----
  if (tasks.includes('cleanPanels')) {
    s.panelClean = T.panelCleanTo;
    causes.push({ key: 'panelsCleaned' });
  }
  if (minor === 'dustDevil') s.panelClean = Math.min(1, s.panelClean + 0.25);
  if (tasks.includes('maintain')) {
    s.wear = Math.max(0, s.wear - T.maintainWear);
    causes.push({ key: 'maintained' });
  }
  if (tasks.includes('pileRegolith') && s.habitat === 'surface') {
    s.shield = clamp(s.shield + T.regolithPerTask, 0, 100);
    causes.push({ key: 'regolithAdded', params: { shield: Math.round(s.shield) } });
  }
  const evaCount = tasks.filter((t) => t === 'cleanPanels' || t === 'pileRegolith').length + (s.buildSolsLeft > 0 ? 3 : 0) + (s.storm?.plan === 'C' ? 2 : 0);

  // ---- power ----
  const tau = stormTau(s);
  const demand = powerDemand(s);
  const totalDemand = Object.values(demand).reduce((a, b) => a + b, 0);
  const solar = solarKWh(s, failure);
  const reactor = s.reactorOn ? T.reactorKWhPerSol : 0;
  const available = s.battery + solar + reactor;
  const powerRatio = clamp(available / totalDemand, 0, 1);
  s.battery = clamp(available - totalDemand, 0, T.batteryKWh);
  const batteryEmpty = available < totalDemand;
  if (s.storm) causes.push({ key: 'stormDark', params: { tau } });
  if (reactor > 0) causes.push({ key: 'reactorRunning', params: { kwh: Math.round(reactor) } });
  if (powerRatio < 0.98) causes.push({ key: 'powerShort', params: { pct: Math.round(powerRatio * 100) } });
  if (batteryEmpty) causes.push({ key: 'batteryEmptyCold' });

  // ---- machines ----
  const n = alive().length;
  let o2Made = 0;
  let waterMade = 0;
  let foodMade = 0;
  if (demand.icePlant > 0) {
    o2Made += T.iceO2PerSol * powerRatio;
    waterMade += T.iceWaterPerSol * powerRatio;
    causes.push({ key: 'iceFlowing', params: { water: Math.round(T.iceWaterPerSol * powerRatio), o2: round1(T.iceO2PerSol * powerRatio) } });
  } else if (s.lifeSupport === 'ice' && s.rover !== 'ok') causes.push({ key: 'iceStopped' });
  if (demand.moxie > 0 && failure !== 'moxieFault') {
    o2Made += T.moxieO2PerSol * powerRatio;
    causes.push({ key: 'moxieMaking', params: { o2: round1(T.moxieO2PerSol * powerRatio) } });
  }
  if (s.lifeSupport === 'greenhouse' && s.settings.greenhouseOn) {
    const lit = s.storm?.plan === 'B' ? 0.3 : 1;
    const tended = tasks.includes('tendGreenhouse');
    s.greenhouseHealth = clamp(s.greenhouseHealth + (tended ? 0.08 : -0.12) - (powerRatio < 0.6 || lit < 1 ? 0.22 : 0), 0, 1);
    s.greenhouseAge += 1;
    const g = greenhouseGrowth(s) * lit;
    const area = T.greenhouseAreaM2;
    const fresh = (area * NASA.potatoYield.value * SOL_DAYS) / 1000; // kg fresh per sol at full growth
    foodMade += ((fresh * NASA.potatoEnergy.value) / NASA.foodEnergyPerCrewDay.value) * NASA.packagedFoodPerCrewDay.value * g;
    o2Made += ((area * NASA.potatoOxygen.value * SOL_DAYS) / 1000) * g;
    if (minor === 'goodHarvest') foodMade += 6;
    waterMade -= T.greenhouseWaterPerSol;
    if (s.greenhouseAge <= T.greenhouseRampSols && s.greenhouseHealth > 0.5) causes.push({ key: 'greenhouseYoung', params: { food: round1(foodMade) } });
    else if (s.greenhouseHealth < 0.6) causes.push({ key: 'greenhouseWilting', params: { health: Math.round(s.greenhouseHealth * 100) } });
    else causes.push({ key: 'greenhouseGrowing', params: { food: round1(foodMade), o2: round1(o2Made) } });
  }

  // ---- oxygen ----
  const o2Used = n * PER_CREW.o2 + evaCount * T.evaO2PerPersonSol + (s.medical?.treatment === 'A' && s.medical.solsLeft > 0 ? 1.5 : 0);
  s.o2 = s.o2 + o2Made - o2Used;

  // ---- water ----
  const recovery = NASA.issWaterRecovery.value * powerRatio;
  let waterUsed = n * PER_CREW.water * (1 - recovery) + T.habitatWaterLossPerSol;
  if (failure === 'waterLeak') waterUsed += 40 * (1 - Math.min(1, (100 - s.wear) / 100) * 0.5);
  if (minor === 'smallLeak') waterUsed += 20;
  s.water = clamp(s.water + waterMade - waterUsed, -999, T.waterTankKg);

  // ---- food ----
  const foodUsed = n * PER_CREW.food * (s.settings.rations ? T.rationFactor : 1);
  s.food = Math.min(T.foodStoreKg, s.food + foodMade - foodUsed);
  if (s.settings.rations) causes.push({ key: 'rationing' });

  // ---- shield ----
  if (s.buildSolsLeft > 0) {
    s.buildSolsLeft -= 1;
    if (s.buildSolsLeft === 0) {
      s.shield = T.shieldUnderground;
      causes.push({ key: 'buildDone', params: { shield: s.shield } });
    } else causes.push({ key: 'building', params: { left: s.buildSolsLeft } });
  }
  if (s.storm) s.shield = clamp(s.shield - (s.habitat === 'underground' && s.buildSolsLeft === 0 ? 2 : T.stormShieldDamage), 0, 100);

  // ---- wear and panel dust ----
  s.wear = clamp(s.wear + T.wearPerSol, 0, 100);
  if (!tasks.includes('cleanPanels')) s.panelClean = clamp(s.panelClean - T.panelDustPerSol * (s.storm ? 3 : 1), 0.3, 1);
  if (s.panelClean < 0.85) causes.push({ key: 'panelsDusty', params: { pct: Math.round(s.panelClean * 100) } });

  // ---- health ----
  const deaths: Role[] = [];
  const allFine = powerRatio >= 0.98 && s.food > 0 && s.o2 > 0 && s.water > 0;
  for (const c of alive()) {
    let dh = 0;
    if (allFine && c.condition === 'ok') dh += T.healthRegen;
    if (tasks.includes('rest')) dh += T.restHeal;
    if (batteryEmpty) dh -= T.coldDamage;
    if (powerRatio < 0.98) dh -= T.co2Damage * (1 - powerRatio) * 2;
    if (failure === 'scrubberHiccup' || minor === 'co2Spike') dh -= powerRatio >= 0.98 ? 1 : 5;
    if (s.food <= 0) dh -= T.starveDamage;
    if (s.water <= 0) dh -= T.starveDamage;
    if (s.settings.rations) dh -= T.rationDamage;
    if (prev.buildSolsLeft > 0) dh -= T.crampedDamage;
    if (c.radSols && c.radSols > 0) {
      dh -= T.radiationSickness;
      c.radSols -= 1;
      if (c.radSols === 0 && c.condition === 'sick' && !(s.medical && s.medical.patient === c.id)) c.condition = 'ok';
    }
    if (s.medical && s.medical.patient === c.id && s.medical.solsLeft > 0) dh += medicalDelta(s, rng);
    if (s.medical && s.medical.treatment === 'B' && s.medical.solsLeft > 0 && s.medical.patient !== c.id) dh -= 3;
    c.health = clamp(c.health + dh, 0, 100);
    if (c.health <= 0) {
      c.alive = false;
      deaths.push(c.id);
    }
  }
  if (tasks.includes('rest')) causes.push({ key: 'rested' });
  if (s.food <= 0) causes.push({ key: 'starving' });
  if (s.water <= 0) causes.push({ key: 'thirsty' });
  if (s.medical && s.medical.solsLeft > 0) {
    const p = s.crew.find((c) => c.id === s.medical!.patient)!;
    const pPrev = prev.crew.find((c) => c.id === p.id)!;
    causes.push({ key: p.health >= pPrev.health ? 'patientBetter' : 'patientWorse', params: { who: p.id, health: Math.round(p.health) } });
    s.medical.solsLeft -= 1;
    if (s.medical.solsLeft === 0 && p.alive && p.health >= 50) p.condition = 'ok';
  }
  if (failure) causes.push({ key: 'failure', params: { kind: failure } });
  if (minor) causes.push({ key: 'minorEvent', params: { kind: minor } });

  // ---- oxygen out: the whole crew is lost ----
  if (s.o2 <= 0) {
    s.o2 = 0;
    for (const c of alive()) {
      c.alive = false;
      c.health = 0;
      deaths.push(c.id);
    }
  }
  s.food = Math.max(0, s.food);
  s.water = Math.max(0, s.water);
  if (deaths.length) causes.unshift({ key: 'crewDied', params: { who: deaths.join(',') } });
  if (causes.length === 0) causes.push({ key: 'allGood' });

  // ---- storm progress ----
  if (s.storm) {
    s.storm.day += 1;
    if (s.storm.day >= STORM_TAU.length) {
      s.storm = null;
      s.stormDone = true;
      if (s.settings.greenhouseOn === false && s.lifeSupport === 'greenhouse') s.settings.greenhouseOn = true;
    }
  }

  const record: SolRecord = {
    sol: prev.sol,
    before,
    tasks,
    settings: { ...prev.settings },
    produced: { solar: round1(solar), reactor, o2: round1(o2Made), water: round1(waterMade), food: round1(foodMade) },
    used: { power: Math.round(totalDemand), o2: round1(o2Used), water: round1(waterUsed), food: round1(foodUsed) },
    powerRatio,
    tau,
    failure,
    minor,
    causes,
    meters: meters(s),
    deaths,
  };
  s.history = [...prev.history, record];
  s.stageLog = prev.stageLog;
  s.rng = rng.state;
  s.tasks = tasks; // keep the routine for the next sol

  // ---- outcome ----
  if (deaths.length > 0) {
    s.status = 'lost';
    s.lossReason = s.crew.every((c) => !c.alive) && s.o2 <= 0 ? 'oxygen' : 'crewLost';
    return s;
  }
  if (prev.sol >= T.sols) {
    if (s.shield > 50) s.status = 'won';
    else {
      s.status = 'lost';
      s.lossReason = 'shieldLow';
    }
    return s;
  }
  s.sol = prev.sol + 1;
  s.pendingStage = stageForSol(s.sol);
  return s;
}

function medicalDelta(s: GameState, rng: Rng): number {
  const m = s.medical!;
  if (m.treatment === 'A') return s.battery > 0 && s.o2 > 0 ? 15 : -15;
  if (m.treatment === 'B') return 4;
  // C: wait and watch. The doctor's own health improves the odds.
  const doctor = s.crew.find((c) => c.id === 'doctor')!;
  const odds = 0.35 + (doctor.alive ? doctor.health / 400 : 0);
  return rng.chance(odds) ? 5 : -28;
}

/** Stars for a won mission: 1 to 3, from crew health and supplies left. */
export function starsFor(s: GameState): 0 | 1 | 2 | 3 {
  if (s.status !== 'won') return 0;
  const minHealth = Math.min(...s.crew.map((c) => c.health));
  const m = meters(s);
  const reserve = Math.min(m.oxygen, m.food, m.power);
  if (minHealth >= 70 && reserve >= 25 && s.shield >= 70) return 3;
  if (minHealth >= 45 && reserve >= 10) return 2;
  return 1;
}

export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
