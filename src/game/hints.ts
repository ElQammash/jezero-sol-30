/** Illustrated hint cards: each one is shown the first time its situation happens. */
export const HINTS = [
  'move',
  'arrows',
  'meters',
  'computer',
  'crew',
  'goal',
  'speed',
  'crisis',
  'timed',
  'storm',
  'crops',
  'source',
  'debrief',
] as const;
export type HintId = (typeof HINTS)[number];

/** Basics that the sol-1 training already teaches: they only pop up if the training was skipped. */
export const BASICS: HintId[] = ['move', 'arrows', 'meters', 'computer', 'goal', 'speed'];

export interface HintPrefs {
  seen: HintId[];
  off: boolean;
}

/** Should this hint pop up now? Never twice, never when hints are off, never over another hint or the training. */
export function shouldShow(id: HintId, prefs: HintPrefs, ctx: { open: HintId | null; training: boolean; trainingSkipped: boolean }): boolean {
  if (prefs.off || ctx.open || ctx.training) return false;
  if (prefs.seen.includes(id)) return false;
  if (BASICS.includes(id) && !ctx.trainingSkipped) return false;
  return true;
}

/** Mark a hint as seen (keeps the list unique). */
export function markSeen(prefs: HintPrefs, id: HintId): HintPrefs {
  return prefs.seen.includes(id) ? prefs : { ...prefs, seen: [...prefs.seen, id] };
}

const SEEN_KEY = 'jezero-hints-seen';
const OFF_KEY = 'jezero-hints-off';
export function loadHintPrefs(): HintPrefs {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as HintId[];
    return { seen: seen.filter((h) => (HINTS as readonly string[]).includes(h)), off: localStorage.getItem(OFF_KEY) === '1' };
  } catch {
    return { seen: [], off: false };
  }
}
export function saveHintPrefs(p: HintPrefs) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(p.seen));
    if (p.off) localStorage.setItem(OFF_KEY, '1');
    else localStorage.removeItem(OFF_KEY);
  } catch {
    /* storage blocked */
  }
}
