import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { input } from '../game/input';
import { sfx } from '../game/sound';
import { guide } from '../game/spots';
import { SKIPPED_KEY, useGame, writeFlag } from '../game/store';
import { useT } from '../game/useT';
import { useWorld } from '../game/worldStore';

/** One training step: what to say, what to point at, and when it is done. */
interface Step {
  id: string;
  touchText?: boolean;
  point?: string; // CSS selector of the HUD element to point at
  next?: boolean; // done with a "Next" button
  done?: (ctx: Ctx) => boolean;
  enter?: () => void;
}
interface Ctx {
  yaw0: number;
  ran: number;
}

const WALK_TARGET = new THREE.Vector3(-4, 0, 23);

export const STEPS: Step[] = [
  { id: 'look', touchText: true, done: (c) => Math.abs(input.camYaw - c.yaw0) > 0.8 },
  {
    id: 'walk',
    touchText: true,
    enter: () => (guide.override = WALK_TARGET.clone()),
    done: () => {
      const p = useWorld.getState().player;
      return Math.hypot(p.x - WALK_TARGET.x, p.z - WALK_TARGET.z) < 2.6;
    },
  },
  { id: 'run', touchText: true, done: (c) => c.ran > 0.8 },
  { id: 'computer', touchText: true, point: '.corner-actions .round-btn', done: () => useGame.getState().modal === 'computer' },
  { id: 'order', point: '.task-grid', done: () => useGame.getState().game.tasks.length > 0 },
  { id: 'close', point: '.computer-panel .row .btn', done: () => useGame.getState().modal === null },
  { id: 'meters', point: '.mchips', next: true },
  { id: 'clock', point: '.sol-clock .ring', next: true },
  { id: 'speed', point: '.speed', next: true },
  { id: 'goal', point: '.goal-pill', next: true },
];

/** Where to show the pointing hand: just under the element. */
function useAnchor(selector: string | undefined) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    let raf = 0;
    const loop = () => {
      const el = document.querySelector(selector);
      const r = el?.getBoundingClientRect() ?? null;
      setRect((prev) => (prev && r && prev.x === r.x && prev.y === r.y && prev.width === r.width ? prev : r));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [selector]);
  return rect;
}

/** The pointing hand and highlight box, also used by the hint cards. */
export function Pointer({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null;
  const below = rect.top < window.innerHeight * 0.55;
  return (
    <>
      <div className="tut-ring" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />
      <div className={`tut-hand ${below ? 'below' : 'above'}`} style={{ left: rect.left + rect.width / 2, top: below ? rect.bottom + 8 : rect.top - 8 }}>
        👆
      </div>
    </>
  );
}

/** First-time training during sol 1: one instruction at a time; time is paused while it runs. */
export default function Tutorial() {
  const { t, dir } = useT();
  const step = useGame((s) => s.tutorialStep);
  const done = useGame((s) => s.tutorialDone);
  const screen = useGame((s) => s.screen);
  const modal = useGame((s) => s.modal);
  const pending = useGame((s) => s.game.pendingStage);
  const sol = useGame((s) => s.game.sol);
  const action = useGame((s) => s.action);
  const setTutorial = useGame((s) => s.setTutorial);
  const [touch] = useState(() => matchMedia('(pointer: coarse)').matches);
  const [finished, setFinished] = useState(false);
  const ctx = useRef<Ctx>({ yaw0: input.camYaw, ran: 0 });

  // start on sol 1 once the first crisis is answered
  useEffect(() => {
    if (!done && step === null && screen === 'play' && !modal && !pending && !action && sol === 1) setTutorial(0);
  }, [done, step, screen, modal, pending, action, sol, setTutorial]);

  const cur = step !== null ? STEPS[step] : undefined;
  useEffect(() => {
    if (!cur) return;
    ctx.current = { yaw0: input.camYaw, ran: 0 };
    cur.enter?.();
  }, [cur]);

  const advance = () => {
    const s = useGame.getState().tutorialStep;
    if (s === null) return;
    guide.override = null;
    sfx('confirm');
    if (s + 1 >= STEPS.length) {
      setTutorial(null, true);
      setFinished(true);
      setTimeout(() => setFinished(false), 3500);
    } else setTutorial(s + 1);
  };

  // watch for the step's goal
  useEffect(() => {
    if (!cur?.done) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const moving = Math.hypot(input.moveX, input.moveY) > 0.3;
      if (input.run && moving) ctx.current.ran += dt;
      if (cur.done!(ctx.current)) advance();
      else raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur]);

  const rect = useAnchor(cur?.point);
  const skip = () => {
    guide.override = null;
    writeFlag(SKIPPED_KEY, true);
    useGame.setState({ tutorialSkipped: true });
    setTutorial(null, true);
  };

  if (finished) return <div className="toast tut-done">🎓 {t('tut.done')}</div>;
  if (!cur || screen !== 'play') return null;
  const text = t(`tut.${cur.id}${cur.touchText && touch ? 'Touch' : ''}`);
  return (
    <div className="tutorial" dir={dir}>
      <Pointer rect={rect} />
      <div className="tut-card">
        <small>
          🎓 {t('tut.title')} · {t('tut.step', { n: step! + 1, m: STEPS.length })}
        </small>
        <p>{text}</p>
        <div className="tut-actions">
          <button type="button" className="btn small ghost" onClick={skip}>
            {t('tut.skip')}
          </button>
          {cur.next && (
            <button type="button" className="btn small primary" onClick={advance}>
              {t('tut.next')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
