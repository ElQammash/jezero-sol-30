import { create } from 'zustand';
import {
  chooseOption,
  createMission,
  endSol,
  OPTION_PREVIEWS,
  retryFromStage,
  setSettings,
  setTasks,
  shelterSeconds,
  TUNING,
  type GameState,
  type OptionId,
  type Settings,
  type SolRecord,
  type StageId,
  type StageOutcome,
  type Task,
} from '../engine';
import type { Gender, Lang } from '../i18n';
import { pushCloud, type CloudBlob } from './cloud';
import type { Quality } from './World';
import type { SiteId } from './world/Base';

export type Screen = 'title' | 'intro' | 'play' | 'end';
export type Modal = null | 'stage' | 'outcome' | 'computer';

/** An option that the player carries out in the 3D world. */
export interface WorldAction {
  stage: StageId;
  option: OptionId;
  site: SiteId;
  /** seconds left (only for timed actions) */
  deadline: number | null;
  objective: 'reactor' | 'repair' | 'shelter';
}

const SAVE_KEY = 'jezero-sol-30-v2';
const OLD_SAVE_KEY = 'jezero-sol-30-v1';

/** Share of the sol (0..1) after which it is night: sunrise at 0, blue sunset just before this. */
export const DAY_END = 0.5;
/** Speed-up while "Sleep until morning" runs. */
const SLEEP_SPEED = 30;

/** How many sol-fractions pass per real second at 1x, at a given point of the sol. */
export function clockRate(clock: number): number {
  const S = TUNING.solSeconds;
  return clock < DAY_END ? DAY_END / (S * TUNING.solDayShare) : (1 - DAY_END) / (S * (1 - TUNING.solDayShare));
}
/** Real seconds left in the sol at 1x speed. */
export function secondsLeft(clock: number): number {
  const S = TUNING.solSeconds;
  if (clock < DAY_END) return (DAY_END - clock) / clockRate(0) + S * (1 - TUNING.solDayShare);
  return (1 - clock) / clockRate(DAY_END);
}
/** Sun position (world time, 0.25 = sunrise, 0.75 = sunset) for a point of the sol. */
export function worldTimeFor(clock: number): number {
  const START = 0.27;
  const DUSK = 0.79; // just after sunset: the blue Martian sunset is still in the sky
  return clock < DAY_END ? START + (clock / DAY_END) * (DUSK - START) : DUSK + ((clock - DAY_END) / (1 - DAY_END)) * (1 + START - DUSK);
}
/** Mars local time (24 Mars hours, sunrise ~06:00). Returns [hours, minutes]. */
export function marsClock(clock: number): [number, number] {
  const mins = Math.floor(((worldTimeFor(clock) * 24 * 60) % (24 * 60)));
  return [Math.floor(mins / 60), mins % 60];
}
export type Speed = 0 | 1 | 2 | 4;

interface Store {
  screen: Screen;
  lang: Lang;
  gender: Gender;
  quality: Quality;
  muted: boolean;
  game: GameState;
  modal: Modal;
  outcome: StageOutcome | null;
  report: SolRecord | null;
  action: WorldAction | null;
  /** 0..1 through the current sol (0 = sunrise). */
  clock: number;
  speed: Speed;
  /** "Sleep until morning" is fast-forwarding the rest of the sol. */
  sleeping: boolean;
  /** Extra reasons to hold the clock (tutorial steps etc.). */
  holds: number;
  toast: { text: 'morning'; sol: number; id: number } | null;
  logOpen: boolean;
  setLang: (l: Lang) => void;
  setGender: (g: Gender) => void;
  setQuality: (q: Quality) => void;
  setMuted: (m: boolean) => void;
  newMission: () => void;
  goto: (s: Screen) => void;
  openModal: (m: Modal) => void;
  choose: (o: OptionId) => void;
  completeAction: (succeeded: boolean) => void;
  tickAction: (dt: number) => void;
  setTasks: (t: Task[]) => void;
  setSettings: (p: Partial<Settings>) => void;
  /** Sleep until morning (fast-forward the rest of the sol). */
  endSol: () => void;
  tick: (dt: number) => void;
  finishSol: () => void;
  setSpeed: (s: Speed) => void;
  setLog: (open: boolean) => void;
  hold: (on: boolean) => void;
  clockRunning: () => boolean;
  closeOutcome: () => void;
  retry: (stage: StageId) => void;
}

const ACTION_FOR: Partial<Record<StageId, Partial<Record<OptionId, Omit<WorldAction, 'stage' | 'option' | 'deadline'>>>>> = {
  power: { A: { site: 'reactor', objective: 'reactor' } },
  mobility: { A: { site: 'garage', objective: 'repair' } },
  communication: { A: { site: 'habitat', objective: 'shelter' } },
};

type Saved = Partial<Pick<Store, 'lang' | 'gender' | 'quality' | 'muted' | 'game' | 'clock' | 'speed'>>;
function loadSave(): Saved {
  try {
    const v2 = localStorage.getItem(SAVE_KEY);
    if (v2) return JSON.parse(v2);
    // v1 saves: same game state, no clock. Keep settings and the mission, start the sol at sunrise.
    const v1 = JSON.parse(localStorage.getItem(OLD_SAVE_KEY) ?? '{}') as Saved;
    return { lang: v1.lang, gender: v1.gender, quality: v1.quality, muted: v1.muted, game: v1.game, clock: 0 };
  } catch {
    return {};
  }
}
function persist(s: Store) {
  const game = { ...s.game, history: s.game.history.map((h) => ({ ...h, before: undefined })), stageLog: s.game.stageLog };
  const blob = { version: 2 as const, updatedAt: Date.now(), lang: s.lang, gender: s.gender, quality: s.quality, muted: s.muted, game, clock: s.clock, speed: s.speed };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(blob));
  } catch {
    /* storage full or blocked */
  }
  pushCloud(blob);
}

/** Apply a save that came from the cloud (another device). */
export function applyCloudSave(blob: CloudBlob) {
  const b = blob as unknown as Saved;
  useGame.setState({
    ...(typeof b.clock === 'number' ? { clock: b.clock } : { clock: 0 }),
    ...(b.lang ? { lang: b.lang } : {}),
    ...(b.gender ? { gender: b.gender } : {}),
    ...(b.game && b.game.status === 'playing' ? { game: b.game as GameState } : {}),
  });
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(blob));
  } catch {
    /* ignore */
  }
}

export function localUpdatedAt(): number {
  try {
    return (JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') as { updatedAt?: number }).updatedAt ?? 0;
  } catch {
    return 0;
  }
}

const saved = loadSave();

export const useGame = create<Store>((set, get) => {
  const after = (patch: Partial<Store>) => {
    set(patch);
    persist(get());
  };
  /** After a stage or a sol: show the next stage, or the end. */
  const advance = (game: GameState): Partial<Store> => {
    if (game.status !== 'playing') return { game, screen: 'end', modal: null };
    if (game.pendingStage) return { game, modal: 'stage' };
    return { game, modal: null };
  };
  return {
    screen: 'title',
    lang: saved.lang ?? (navigator.language?.startsWith('ar') ? 'ar' : 'en'),
    gender: saved.gender ?? 'm',
    quality: saved.quality ?? 'medium',
    muted: saved.muted ?? false,
    game: saved.game && saved.game.status === 'playing' ? (saved.game as GameState) : createMission(Date.now() >>> 0),
    modal: null,
    outcome: null,
    report: null,
    action: null,
    clock: typeof saved.clock === 'number' && saved.game?.status === 'playing' ? saved.clock : 0,
    speed: saved.speed ?? 1,
    sleeping: false,
    holds: 0,
    toast: null,
    logOpen: false,
    setLang: (lang) => after({ lang }),
    setGender: (gender) => after({ gender }),
    setQuality: (quality) => after({ quality }),
    setMuted: (muted) => after({ muted }),
    newMission: () => after({ game: createMission((Date.now() ^ (Math.random() * 1e9)) >>> 0), screen: 'intro', modal: null, action: null, outcome: null, clock: 0, sleeping: false }),
    goto: (screen) => {
      if (screen === 'play') {
        const g = get().game;
        set({ screen, modal: g.pendingStage ? 'stage' : null });
      } else set({ screen });
    },
    openModal: (modal) => set({ modal }),
    choose: (option) => {
      const { game } = get();
      const stage = game.pendingStage!;
      const preview = OPTION_PREVIEWS[stage].find((o) => o.id === option)!;
      const act = ACTION_FOR[stage]?.[option];
      if (preview.inWorld && act) {
        set({
          modal: null,
          action: { stage, option, deadline: stage === 'communication' ? shelterSeconds(game) : null, ...act },
        });
        return;
      }
      const { state, outcome } = chooseOption(game, option);
      after({ game: state, outcome, modal: 'outcome' });
    },
    completeAction: (succeeded) => {
      const { game, action } = get();
      if (!action) return;
      const { state, outcome } = chooseOption(game, action.option, { actionSucceeded: succeeded });
      after({ game: state, outcome, modal: 'outcome', action: null });
    },
    tickAction: (dt) => {
      const a = get().action;
      if (!a || a.deadline === null) return;
      const left = a.deadline - dt;
      if (left <= 0) get().completeAction(false);
      else set({ action: { ...a, deadline: left } });
    },
    setTasks: (t) => after({ game: setTasks(get().game, t) }),
    setSettings: (p) => after({ game: setSettings(get().game, p) }),
    endSol: () => {
      if (get().game.pendingStage || get().action) return;
      set({ modal: null, sleeping: true, speed: get().speed || 1 });
    },
    clockRunning: () => {
      const s = get();
      return s.screen === 'play' && s.modal === null && !s.action && !s.game.pendingStage && s.game.status === 'playing' && s.holds === 0 && (s.speed > 0 || s.sleeping);
    },
    tick: (dt) => {
      const s = get();
      if (!s.clockRunning()) return;
      const fast = (window as unknown as { __fast?: boolean }).__fast ? 400 : 1;
      const mult = (s.sleeping ? SLEEP_SPEED : s.speed) * fast;
      const c = s.clock + clockRate(s.clock) * Math.min(dt, 0.25) * mult;
      if (c >= 1) get().finishSol();
      else set({ clock: c });
    },
    finishSol: () => {
      const next = endSol(get().game);
      const report = next.history.at(-1) ?? null;
      after({ clock: 0, sleeping: false, report, toast: next.status === 'playing' ? { text: 'morning', sol: next.sol, id: Date.now() } : null, ...advance(next) });
    },
    setSpeed: (speed) => set({ speed }),
    setLog: (logOpen) => set({ logOpen }),
    hold: (on) => set({ holds: Math.max(0, get().holds + (on ? 1 : -1)) }),
    closeOutcome: () => {
      const g = get().game;
      after({ outcome: null, ...advance(g) });
    },
    retry: (stage) => {
      const g = retryFromStage(get().game, stage);
      after({ game: g, screen: 'play', modal: 'stage', action: null, outcome: null, report: null, clock: 0, sleeping: false });
    },
  };
});

if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;
