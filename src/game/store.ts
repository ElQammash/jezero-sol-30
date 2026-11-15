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
export type Modal = null | 'stage' | 'outcome' | 'computer' | 'solReport';

/** An option that the player carries out in the 3D world. */
export interface WorldAction {
  stage: StageId;
  option: OptionId;
  site: SiteId;
  /** seconds left (only for timed actions) */
  deadline: number | null;
  objective: 'reactor' | 'repair' | 'shelter';
}

const SAVE_KEY = 'jezero-sol-30-v1';

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
  nightfall: number; // 0 = day, 0..1 animating the night between sols
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
  endSol: () => void;
  finishNight: () => void;
  closeOutcome: () => void;
  closeReport: () => void;
  retry: (stage: StageId) => void;
}

const ACTION_FOR: Partial<Record<StageId, Partial<Record<OptionId, Omit<WorldAction, 'stage' | 'option' | 'deadline'>>>>> = {
  power: { A: { site: 'reactor', objective: 'reactor' } },
  mobility: { A: { site: 'garage', objective: 'repair' } },
  communication: { A: { site: 'habitat', objective: 'shelter' } },
};

function loadSave(): Partial<Pick<Store, 'lang' | 'gender' | 'quality' | 'muted' | 'game'>> {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}');
  } catch {
    return {};
  }
}
function persist(s: Store) {
  const game = { ...s.game, history: s.game.history.map((h) => ({ ...h, before: undefined })), stageLog: s.game.stageLog };
  const blob = { version: 1 as const, updatedAt: Date.now(), lang: s.lang, gender: s.gender, quality: s.quality, muted: s.muted, game };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(blob));
  } catch {
    /* storage full or blocked */
  }
  pushCloud(blob);
}

/** Apply a save that came from the cloud (another device). */
export function applyCloudSave(blob: CloudBlob) {
  const b = blob as unknown as Partial<Pick<Store, 'lang' | 'gender' | 'quality' | 'muted' | 'game'>>;
  useGame.setState({
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
    nightfall: 0,
    setLang: (lang) => after({ lang }),
    setGender: (gender) => after({ gender }),
    setQuality: (quality) => after({ quality }),
    setMuted: (muted) => after({ muted }),
    newMission: () => after({ game: createMission((Date.now() ^ (Math.random() * 1e9)) >>> 0), screen: 'intro', modal: null, action: null, outcome: null }),
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
      set({ modal: null, nightfall: 0.0001 });
    },
    finishNight: () => {
      const next = endSol(get().game);
      after({ nightfall: 0, report: next.history.at(-1) ?? null, ...(next.status === 'playing' ? { game: next, modal: 'solReport' } : advance(next)) });
    },
    closeOutcome: () => {
      const g = get().game;
      after({ outcome: null, ...advance(g) });
    },
    closeReport: () => after({ report: null, ...advance(get().game) }),
    retry: (stage) => {
      const g = retryFromStage(get().game, stage);
      after({ game: g, screen: 'play', modal: 'stage', action: null, outcome: null, report: null });
    },
  };
});

if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;
