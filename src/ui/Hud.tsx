import { useEffect, useRef, useState } from 'react';

import { meters, solsLeft, STAGE_ORDER, type GameState } from '../engine';
import { METER_SOURCES } from '../game/facts';
import { input, setTouchMove } from '../game/input';
import { sfx } from '../game/sound';
import { useGame } from '../game/store';
import { useT } from '../game/useT';
import { SPOTS, spotPosition, type Spot } from '../game/spots';
import { useWorld } from '../game/worldStore';
import SourceButton from './SourceButton';

const ICON = { power: '⚡', oxygen: '🫁', food: '🥔', shield: '🛡️' } as const;

function Meter({ k, value, sub }: { k: keyof typeof ICON; value: number; sub?: string }) {
  const { t } = useT();
  const level = value < 20 ? 'danger' : value < 40 ? 'warn' : 'ok';
  return (
    <div className={`meter ${level}`}>
      <div className="meter-top">
        <span className="meter-icon">{ICON[k]}</span>
        <span className="meter-name">{t(`meters.${k}`)}</span>
        <span className="meter-val">{value}%</span>
      </div>
      <div className="meter-bar">
        <div style={{ inlineSize: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
      <div className="meter-sub">
        {sub}
        <SourceButton keys={METER_SOURCES[k]} small />
      </div>
    </div>
  );
}

function Crew({ game }: { game: GameState }) {
  const { t } = useT();
  return (
    <div className="crew">
      {game.crew.map((c) => (
        <div key={c.id} className={`crew-card ${!c.alive ? 'dead' : c.health < 35 ? 'danger' : c.health < 60 ? 'warn' : ''}`}>
          <div className="crew-ring" style={{ ['--p' as string]: `${c.health}%` }}>
            <span>{c.id === 'commander' ? '★' : t(`names.${c.id}`).slice(0, 1)}</span>
          </div>
          <div className="crew-text">
            <b>{t(`names.${c.id}`)}</b>
            <small>{t(`roles.${c.id}`)}</small>
          </div>
          {c.condition !== 'ok' && c.alive && <span className="crew-flag">{c.condition === 'sick' ? '🤒' : '🩹'}</span>}
        </div>
      ))}
    </div>
  );
}

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState<[number, number]>([0, 0]);
  const id = useRef<number | null>(null);
  const move = (e: React.PointerEvent) => {
    if (id.current !== e.pointerId || !base.current) return;
    const r = base.current.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    setKnob([x, y]);
    setTouchMove(x, -y, true);
  };
  const end = () => {
    id.current = null;
    setKnob([0, 0]);
    setTouchMove(0, 0, false);
  };
  return (
    <div
      ref={base}
      className="joystick"
      onPointerDown={(e) => {
        id.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="knob" style={{ transform: `translate(${knob[0] * 38}px, ${knob[1] * 38}px)` }} />
    </div>
  );
}

export default function Hud() {
  const { t, n, dir } = useT();
  const game = useGame((s) => s.game);
  const action = useGame((s) => s.action);
  const modal = useGame((s) => s.modal);
  const nightfall = useGame((s) => s.nightfall);
  const lang = useGame((s) => s.lang);
  const setLang = useGame((s) => s.setLang);
  const muted = useGame((s) => s.muted);
  const setMuted = useGame((s) => s.setMuted);
  const [near, setNear] = useState<Spot | null>(null);
  const [touch] = useState(() => matchMedia('(pointer: coarse)').matches);

  // find the closest interaction spot and react to E / tap
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const st = useGame.getState();
      st.tickAction(dt);
      input.locked = st.modal !== null || st.nightfall > 0;
      const p = useWorld.getState().player;
      let best: Spot | null = null;
      for (const s of SPOTS) {
        const c = spotPosition(s.id);
        if (Math.hypot(p.x - c.x, p.z - c.z) < s.radius) best = s.id;
      }
      const a = st.action;
      // only show spots that make sense right now
      if (best === 'reactor' && a?.objective !== 'reactor') best = null;
      if (best === 'garage' && a?.objective !== 'repair') best = null;
      setNear((prev) => (prev === best ? prev : best));
      if (input.interact) {
        input.interact = false;
        if (best && !input.locked) activate(best);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const activate = (s: Spot) => {
    const st = useGame.getState();
    sfx('click');
    if (st.action) {
      if ((s === 'reactor' && st.action.objective === 'reactor') || (s === 'garage' && st.action.objective === 'repair') || (s === 'airlock' && st.action.objective === 'shelter')) {
        st.completeAction(true);
        return;
      }
    }
    if (s === 'computer') st.openModal('computer');
    if (s === 'airlock' && !st.action) st.openModal('computer');
  };

  const m = meters(game);
  const left = solsLeft(game);
  const stageNo = STAGE_ORDER.findIndex((s) => !game.choices[s]);
  const objective = action ? t(`objectives.${action.objective}`) : game.pendingStage ? t('objectives.decide') : t('objectives.explore');
  const target = action ? spotPosition(action.objective === 'shelter' ? 'airlock' : action.objective === 'reactor' ? 'reactor' : 'garage') : null;
  const p = useWorld.getState().player;
  const dist = target ? Math.round(Math.hypot(p.x - target.x, p.z - target.z)) : 0;

  return (
    <div className="hud" dir={dir}>
      <div className="hud-top">
        <div className="sol-badge">
          <b>{t('common.sol', { n: game.sol })}</b>
          <small>{stageNo >= 0 ? t('stage.label', { n: stageNo + 1 }) : '✓'}</small>
        </div>
        <div className="meters">
          <Meter k="power" value={m.power} />
          <Meter k="oxygen" value={m.oxygen} sub={t('meters.solsLeft', { n: Math.floor(left.oxygen) })} />
          <Meter k="food" value={m.food} sub={t('meters.solsLeft', { n: Math.floor(left.food) })} />
          <Meter k="shield" value={m.shield} />
        </div>
        <div className="top-actions">
          <button type="button" className="icon-btn" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
            {t('meta.switchTo')}
          </button>
          <button type="button" className="icon-btn" onClick={() => setMuted(!muted)} aria-pressed={muted}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      <Crew game={game} />

      <div className="hud-bottom">
        <div className="objective">
          <small>{t('hud.objective')}</small>
          <span>{objective}</span>
          {target && <em className="dist">{n(dist)} m</em>}
          {action?.deadline != null && <strong className="countdown">{n(Math.ceil(action.deadline))}</strong>}
        </div>
        {near && !modal && nightfall === 0 && (
          <button type="button" className="prompt" onClick={() => activate(near)}>
            <kbd>{touch ? t('hud.interactTouch') : 'E'}</kbd>
            {near === 'computer' ? t('hud.baseComputer') : near === 'airlock' ? (action?.objective === 'shelter' ? '🏠' : t('hud.baseComputer')) : '🔧'}
          </button>
        )}
        {!game.pendingStage && !action && !modal && nightfall === 0 && (
          <div className="bottom-actions">
            <button type="button" className="btn" onClick={() => (sfx('click'), useGame.getState().openModal('computer'))}>
              🖥 {t('hud.baseComputer')}
            </button>
            <button type="button" className="btn primary" onClick={() => (sfx('night'), useGame.getState().endSol())}>
              🌙 {t('hud.endSol')}
            </button>
          </div>
        )}
      </div>
      {touch && <Joystick />}
      {touch && near && (
        <button type="button" className="act-btn" onClick={() => activate(near)}>
          ✋
        </button>
      )}
      {!touch && <div className="help">{t('hud.help')}</div>}
    </div>
  );
}
