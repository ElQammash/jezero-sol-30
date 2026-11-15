export type Role = 'commander' | 'engineer' | 'botanist' | 'doctor' | 'geologist' | 'pilot';
export const ROLES: Role[] = ['commander', 'engineer', 'botanist', 'doctor', 'geologist', 'pilot'];

export interface CrewMember {
  id: Role;
  health: number; // 0..100
  alive: boolean;
  condition: 'ok' | 'injured' | 'sick';
  /** Sols of radiation sickness left (after a big solar-storm dose). */
  radSols?: number;
}

export type StageId = 'habitat' | 'lifeSupport' | 'power' | 'mobility' | 'communication' | 'safety';
export type OptionId = 'A' | 'B' | 'C';
export type Task = 'cleanPanels' | 'pileRegolith' | 'maintain' | 'tendGreenhouse' | 'rest';

export interface Settings {
  rations: boolean; // eat 80% portions
  heatingLow: boolean;
  greenhouseOn: boolean;
  icePlantOn: boolean;
  moxieOn: boolean;
}

export type FailureKind = 'panelFault' | 'waterLeak' | 'scrubberHiccup' | 'moxieFault';
export type MinorEvent = 'dustDevil' | 'smallLeak' | 'co2Spike' | 'goodHarvest' | null;

export type LossReason = 'oxygen' | 'crewLost' | 'shieldLow' | 'colonyDark';

export interface MedicalCase {
  patient: Role;
  treatment: OptionId;
  solsLeft: number;
}

export interface GameState {
  seed: number;
  rng: number;
  sol: number; // the sol being played, 1..30
  pendingStage: StageId | null;
  battery: number; // kWh
  o2: number; // kg
  food: number; // kg
  water: number; // kg
  shield: number; // 0..100
  panelClean: number; // 0..1
  wear: number; // 0..100
  habitat: 'surface' | 'underground' | null;
  buildSolsLeft: number;
  lifeSupport: 'ice' | 'greenhouse' | 'moxie' | null;
  greenhouseAge: number;
  greenhouseHealth: number; // 0..1
  rover: 'ok' | 'broken' | 'lost';
  roverAt: 'base' | 'iceSite' | 'cache';
  reactorOn: boolean;
  storm: { day: number; plan: OptionId } | null; // day index into the storm profile
  stormDone: boolean;
  commsDamaged: boolean;
  medical: MedicalCase | null;
  crew: CrewMember[];
  settings: Settings;
  tasks: Task[];
  choices: Partial<Record<StageId, OptionId>>;
  history: SolRecord[];
  stageLog: StageRecord[];
  status: 'playing' | 'won' | 'lost';
  lossReason: LossReason | null;
}

export interface Meters {
  power: number; // 0..100
  oxygen: number;
  food: number;
  shield: number;
}

export type CauseKey =
  | 'stormDark'
  | 'reactorRunning'
  | 'powerShort'
  | 'batteryEmptyCold'
  | 'co2Rising'
  | 'iceFlowing'
  | 'iceStopped'
  | 'moxieMaking'
  | 'greenhouseGrowing'
  | 'greenhouseWilting'
  | 'greenhouseYoung'
  | 'building'
  | 'buildDone'
  | 'regolithAdded'
  | 'panelsCleaned'
  | 'panelsDusty'
  | 'maintained'
  | 'rested'
  | 'rationing'
  | 'starving'
  | 'thirsty'
  | 'patientBetter'
  | 'patientWorse'
  | 'failure'
  | 'minorEvent'
  | 'crewDied'
  | 'allGood';

export interface Cause {
  key: CauseKey;
  params?: Record<string, number | string>;
}

export interface SolRecord {
  sol: number;
  before: GameState; // snapshot (history emptied) for retry
  tasks: Task[];
  settings: Settings;
  produced: { solar: number; reactor: number; o2: number; water: number; food: number };
  used: { power: number; o2: number; water: number; food: number };
  powerRatio: number;
  tau: number;
  failure: FailureKind | null;
  minor: MinorEvent;
  causes: Cause[];
  meters: Meters;
  deaths: Role[];
}

export interface StageRecord {
  stage: StageId;
  sol: number;
  option: OptionId;
  before: GameState;
  outcome: StageOutcome;
}

export interface StageOutcome {
  stage: StageId;
  option: OptionId;
  success: boolean;
  /** Short outcome lines (i18n keys under `outcomes.`) */
  lines: { key: string; params?: Record<string, number | string> }[];
  delta: Partial<Meters>;
  factKey: string;
  injured: Role[];
  deaths: Role[];
}

/** Context the 3D world passes in for choices that involve player action. */
export interface ChoiceContext {
  /** The player completed the in-world action (repair, reaching the shelter, etc.). Undefined = roll the odds. */
  actionSucceeded?: boolean;
}
