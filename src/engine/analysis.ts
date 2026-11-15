/**
 * Mission debrief. Finds the decision that mattered most by replaying each
 * stage with the other options (same luck, same careful daily routine) and
 * comparing how the mission would have ended.
 */
import { meters, STAGE_ORDER } from './sim';
import { scoreOptions } from './strategies';
import type { GameState, LossReason, Meters, OptionId, StageId } from './types';

export interface StageReview {
  stage: StageId;
  sol: number;
  chosen: OptionId;
  /** Win rate of each option from that moment (replays). */
  scores: Record<OptionId, number>;
  best: OptionId;
  /** How much better the best alternative was than the choice (0..1). */
  regret: number;
}

export interface Debrief {
  status: GameState['status'];
  lossReason: LossReason | null;
  endSol: number;
  reviews: StageReview[];
  decisive: StageReview | null;
  /** For a loss: the option that would most likely have saved the mission. For a win: the choice that helped most. */
  timeline: { sol: number; meters: Meters; event: string | null }[];
}

export function analyzeMission(s: GameState, rollouts = 12): Debrief {
  const reviews: StageReview[] = s.stageLog.map((rec) => {
    const start = { ...rec.before };
    const scored = scoreOptions(start, rollouts);
    const scores = Object.fromEntries(scored.map((x) => [x.option, x.winRate])) as Record<OptionId, number>;
    const best = scored.reduce((a, b) => (b.winRate > a.winRate ? b : a)).option;
    return { stage: rec.stage, sol: rec.sol, chosen: rec.option, scores, best, regret: Math.max(0, scores[best] - scores[rec.option]) };
  });
  let decisive: StageReview | null = null;
  if (s.status === 'lost') {
    // earliest stage where another option was clearly better
    decisive = reviews.find((r) => r.regret >= 0.25) ?? reviews.reduce<StageReview | null>((a, r) => (!a || r.regret > a.regret ? r : a), null);
  } else if (s.status === 'won') {
    // the choice that beat its alternatives by the most
    decisive = reviews.reduce<StageReview | null>((a, r) => {
      const margin = r.scores[r.chosen] - Math.min(...Object.values(r.scores));
      const am = a ? a.scores[a.chosen] - Math.min(...Object.values(a.scores)) : -1;
      return margin > am ? r : a;
    }, null);
  }
  const timeline = s.history.map((h) => {
    const stage = s.stageLog.find((x) => x.sol === h.sol)?.stage ?? null;
    return { sol: h.sol, meters: h.meters, event: h.deaths.length ? 'death' : stage };
  });
  if (s.status !== 'playing' && timeline.length === 0) timeline.push({ sol: s.sol, meters: meters(s), event: null });
  return { status: s.status, lossReason: s.lossReason, endSol: s.sol, reviews, decisive, timeline };
}

export function stageIndex(stage: StageId): number {
  return STAGE_ORDER.indexOf(stage);
}

/** Retry from the moment a stage's decision was asked. */
export function retryFromStage(s: GameState, stage: StageId): GameState {
  const idx = s.stageLog.findIndex((r) => r.stage === stage);
  if (idx < 0) throw new Error(`Stage ${stage} was not reached`);
  const rec = s.stageLog[idx];
  const solIdx = s.history.findIndex((h) => h.sol >= rec.sol);
  return {
    ...structuredClone(rec.before),
    history: solIdx < 0 ? s.history : s.history.slice(0, solIdx),
    stageLog: s.stageLog.slice(0, idx),
  };
}
