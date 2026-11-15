import { useEffect, useMemo, useRef, useState } from 'react';
import { liveMeters, meters, solPreview, solsLeft, STAGE_ORDER, type GameState, type Meters } from '../engine';
import { METER_SOURCES } from '../game/facts';
import { input, setTouchMove } from '../game/input';
import { sfx } from '../game/sound';
import { currentTarget, SPOTS, spotPosition, type Spot } from '../game/spots';
import { marsClock, secondsLeft, useGame, type Speed } from '../game/store';
import { causeText } from './Modals';
import { useT } from '../game/useT';
import { useWorld } from '../game/worldStore';
import SourceButton from './SourceButton';

const ICON = { power: '⚡', oxygen: '🫁', food: '🥔', shield: '🛡️' } as const;
type MeterKey = keyof typeof ICON;

/** Small square meter; tap/click for details and the NASA source. */
function MeterChip({ k, value, sub, open, onToggle, trend }: { k: MeterKey; value: number; sub?: string; open: boolean; onToggle: () => void; trend?: 'up' | 'down' }) {
  const { t } = useT();
  const level = value < 20 ? 'danger' : value < 40 ? 'warn' : 'ok';
  return (
    <div className="chip-wrap">
      <button type="button" className={`mchip ${level} ${open ? 'open' : ''}`} onClick={onToggle} aria-label={`${t(`meters.${k}`)} ${value}%`}>
        <span className="mchip-icon">{ICON[k]}</span>
        <span className="mchip-val">
          {value}%{trend && <i className={`trend ${trend}`}>{trend === 'up' ? '▲' : '▼'}</i>}
        </span>
        <span className="mchip-bar">
          <span style={{ inlineSize: `${Math.max(3, Math.min(100, value))}%` }} />
        </span>
      </button>
      {open && (
        <div className="mchip-pop">
          <b>{t(`meters.${k}`)}</b>
          {sub && <span>{sub}</span>}
          <SourceButton keys={METER_SOURCES[k]} small />
        </div>
      )}
    </div>
  );
}

/** Six small crew dots down the side of the screen. */
function CrewColumn({ game }: { game: GameState }) {
  const { t } = useT();
  const [show, setShow] = useState<string | null>(null);
  return (
    <div className="crew-col">
      {game.crew.map((c) => (
        <button
          type="button"
          key={c.id}
          className={`cdot ${!c.alive ? 'dead' : c.health < 35 ? 'danger' : c.health < 60 ? 'warn' : ''}`}
          style={{ ['--p' as string]: `${c.health}%` }}
          onClick={() => setShow(show === c.id ? null : c.id)}
          title={`${t(`names.${c.id}`)} · ${t(`roles.${c.id}`)} · ${Math.round(c.health)}%`}
        >
          <span>{c.id === 'commander' ? '★' : t(`names.${c.id}`).slice(0, 1)}</span>
          {c.condition !== 'ok' && c.alive && <i className="cflag">{c.condition === 'sick' ? '🤒' : '🩹'}</i>}
          {show === c.id && (
            <em className="cname">
              {t(`names.${c.id}`)} · {t(`roles.${c.id}`)} · {Math.round(c.health)}%
            </em>
          )}
        </button>
      ))}
    </div>
  );
}

/** Sol number, Mars clock with a day/night ring, time left, and speed controls. */
function SolClock({ game }: { game: GameState }) {
  const { t, n } = useT();
  const clock = useGame((s) => s.clock);
  const speed = useGame((s) => s.speed);
  const sleeping = useGame((s) => s.sleeping);
  const running = useGame((s) => s.clockRunning());
  const setSpeed = useGame((s) => s.setSpeed);
  const [h, m] = marsClock(clock);
  const left = Math.ceil(secondsLeft(clock));
  const stageNo = STAGE_ORDER.findIndex((s) => !game.choices[s]);
  const night = h >= 19 || h < 6;
  const pad = (x: number) => n(x).padStart(2, n(0));
  return (
    <div className="sol-clock">
      <div className={`ring ${night ? 'night' : ''}`} style={{ ['--p' as string]: `${clock * 360}deg` }} title={t('hud.marsTime')}>
        <span>{night ? '🌙' : '☀'}</span>
      </div>
      <div className="sol-mini">
        <b>{t('common.sol', { n: game.sol })}</b>
        <small className="mars-time">
          {pad(h)}:{pad(m)} · {t('hud.timeLeft', { t: `${n(Math.floor(left / 60))}:${pad(left % 60)}` })}
        </small>
        <small>{stageNo >= 0 ? t('stage.label', { n: stageNo + 1 }) : '✓'}</small>
      </div>
      <div className="speed" role="group" aria-label={t('hud.speed')}>
        {([0, 1, 2, 4] as Speed[]).map((v) => (
          <button key={v} type="button" className={`spd ${speed === v && !sleeping ? 'on' : ''}`} onClick={() => (sfx('tick'), setSpeed(v))} aria-label={v === 0 ? t('hud.pause') : `${v}x`}>
            {v === 0 ? '⏸' : `${n(v)}×`}
          </button>
        ))}
        {!running && speed !== 0 && <i className="held">⏸</i>}
      </div>
    </div>
  );
}

/** What is being done today, how the meters will move by tonight, and what happened last sol. */
function MissionLog({ game, now, target }: { game: GameState; now: Meters; target: Meters | null }) {
  const { t, dir } = useT();
  const clock = useGame((s) => s.clock);
  const report = game.history.at(-1);
  const setLog = useGame((s) => s.setLog);
  const pct = Math.round(clock * 100);
  const start = meters(game);
  return (
    <div className="mission-log" dir={dir}>
      <div className="log-head">
        <b>📋 {t('hud.log')}</b>
        <button type="button" className="x" onClick={() => setLog(false)} aria-label={t('common.close')}>
          ✕
        </button>
      </div>
      <h4>{t('hud.logToday')}</h4>
      {game.tasks.length === 0 && <p className="muted">{t('hud.logEmpty')}</p>}
      <ul>
        {game.tasks.map((task) => (
          <li key={task}>
            <span>{t('hud.taskLine', { task: t(`tasks.${task}.name`), pct })}</span>
            <span className="pbar">
              <i style={{ inlineSize: `${pct}%` }} />
            </span>
          </li>
        ))}
      </ul>
      {target && (
        <>
          <h4>{t('hud.logTonight')}</h4>
          <ul>
            {(['power', 'oxygen', 'food', 'shield'] as const)
              .filter((k) => target[k] !== start[k])
              .map((k) => (
                <li key={k} className={target[k] < start[k] ? 'down' : 'up'}>
                  {ICON[k]} {t('hud.meterLine', { meter: t(`meters.${k}`), from: now[k], to: target[k] })}
                </li>
              ))}
          </ul>
        </>
      )}
      {report && (
        <>
          <h4>{t('hud.logLast')}</h4>
          <ul className="lines">
            {report.causes.slice(0, 6).map((c, i) => (
              <li key={i}>{causeText(t, c)}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Toast() {
  const { t } = useT();
  const toast = useGame((s) => s.toast);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setShow(true);
    const id = setTimeout(() => setShow(false), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  if (!toast || !show) return null;
  return <div className="toast">☀ {t('hud.morning', { n: toast.sol })}</div>;
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
      <div className="knob" style={{ transform: `translate(${knob[0] * 32}px, ${knob[1] * 32}px)` }} />
    </div>
  );
}

export default function Hud() {
  const { t, n, dir } = useT();
  const game = useGame((s) => s.game);
  const action = useGame((s) => s.action);
  const modal = useGame((s) => s.modal);
  const sleeping = useGame((s) => s.sleeping);
  const clock = useGame((s) => s.clock);
  const logOpen = useGame((s) => s.logOpen);
  const lang = useGame((s) => s.lang);
  const setLang = useGame((s) => s.setLang);
  const muted = useGame((s) => s.muted);
  const setMuted = useGame((s) => s.setMuted);
  const [near, setNear] = useState<Spot | null>(null);
  const [touch] = useState(() => matchMedia('(pointer: coarse)').matches);
  const [openMeter, setOpenMeter] = useState<MeterKey | null>(null);
  const [objOpen, setObjOpen] = useState(true);
  const [nav, setNav] = useState<{ dist: number; angle: number } | null>(null);
  const [helpVisible, setHelpVisible] = useState(true);
  const [compDist, setCompDist] = useState(0);

  const objective = action ? t(`objectives.${action.objective}`) : game.pendingStage ? t('objectives.decide') : t('objectives.explore');
  // a new objective pops open for a few seconds, then folds into a small icon
  useEffect(() => {
    setObjOpen(true);
    const id = setTimeout(() => setObjOpen(false), action ? 9000 : 6000);
    return () => clearTimeout(id);
  }, [objective, action]);
  useEffect(() => {
    const id = setTimeout(() => setHelpVisible(false), 20000);
    return () => clearTimeout(id);
  }, []);

  // proximity, interaction key, countdown, and the compass to the current target
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let navTick = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const st = useGame.getState();
      st.tickAction(dt);
      input.locked = st.modal !== null || st.sleeping;
      const p = useWorld.getState().player;
      let best: Spot | null = null;
      for (const s of SPOTS) {
        const c = spotPosition(s.id);
        if (Math.hypot(p.x - c.x, p.z - c.z) < s.radius) best = s.id;
      }
      const a = st.action;
      if (best === 'reactor' && a?.objective !== 'reactor') best = null;
      if (best === 'garage' && a?.objective !== 'repair') best = null;
      setNear((prev) => (prev === best ? prev : best));
      if (input.interact) {
        input.interact = false;
        if (best && !input.locked) activate(best);
      }
      if ((navTick += dt) > 0.1) {
        navTick = 0;
        const cp = spotPosition('computer');
        setCompDist(Math.round(Math.hypot(cp.x - p.x, cp.z - p.z)));
        const target = currentTarget(st.game, a);
        if (target) {
          const c = spotPosition(target);
          const dx = c.x - p.x;
          const dz = c.z - p.z;
          // angle relative to where the camera looks (forward = -sin(yaw), -cos(yaw))
          const bearing = Math.atan2(dx, dz);
          const camForward = Math.atan2(-Math.sin(input.camYaw), -Math.cos(input.camYaw));
          setNav({ dist: Math.round(Math.hypot(dx, dz)), angle: camForward - bearing });
        } else setNav(null);
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
    if (s === 'computer' || (s === 'airlock' && !st.action)) st.openModal('computer');
  };

  // meters move live toward the engine's result for this sol (recomputed when orders change)
  const preview = useMemo(() => {
    try {
      return solPreview(game);
    } catch {
      return null;
    }
  }, [game]);
  const m = liveMeters(game, clock, preview);
  const target = preview ? meters(preview) : null;
  const start = meters(game);
  const left = solsLeft(game);
  const toggle = (k: MeterKey) => setOpenMeter(openMeter === k ? null : k);
  const free = !game.pendingStage && !action && !modal && !sleeping;
  const trend = (k: MeterKey) => (target && target[k] !== start[k] ? (target[k] > start[k] ? 'up' : 'down') : undefined);

  return (
    <div className="hud" dir={dir}>
      {/* top: sol + four compact meters + settings */}
      <div className="hud-top">
        <SolClock game={game} />
        <div className="mchips">
          <MeterChip k="power" value={m.power} trend={trend('power')} open={openMeter === 'power'} onToggle={() => toggle('power')} />
          <MeterChip k="oxygen" value={m.oxygen} trend={trend('oxygen')} sub={t('meters.solsLeft', { n: Math.floor(left.oxygen) })} open={openMeter === 'oxygen'} onToggle={() => toggle('oxygen')} />
          <MeterChip k="food" value={m.food} trend={trend('food')} sub={t('meters.solsLeft', { n: Math.floor(left.food) })} open={openMeter === 'food'} onToggle={() => toggle('food')} />
          <MeterChip k="shield" value={m.shield} trend={trend('shield')} open={openMeter === 'shield'} onToggle={() => toggle('shield')} />
        </div>
        <div className="top-actions">
          <button type="button" className="mini-btn" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
            {lang === 'en' ? 'ع' : 'EN'}
          </button>
          <button type="button" className="mini-btn" onClick={() => setMuted(!muted)} aria-pressed={muted}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* navigation pill: only while there is somewhere to go */}
      {nav && (
        <div className={`nav-pill ${action?.objective === 'shelter' ? 'urgent' : ''}`}>
          <span className="arrow" style={{ transform: `rotate(${nav.angle}rad)` }}>
            ▲
          </span>
          <b>{n(nav.dist)} m</b>
          {action?.deadline != null && <strong className="countdown">{n(Math.ceil(action.deadline))}</strong>}
        </div>
      )}

      <CrewColumn game={game} />

      {/* objective: an icon that opens into a card */}
      <div className={`objective-box ${objOpen ? 'open' : ''}`}>
        {objOpen ? (
          <div className="objective-card">
            <small>🎯 {t('hud.objective')}</small>
            <span>{objective}</span>
            <button type="button" className="x" onClick={() => setObjOpen(false)} aria-label={t('common.close')}>
              ✕
            </button>
          </div>
        ) : (
          <button type="button" className="obj-icon" onClick={() => setObjOpen(true)} aria-label={t('hud.objective')}>
            🎯
          </button>
        )}
      </div>

      {near && !modal && !sleeping && (
        <button type="button" className="prompt" onClick={() => activate(near)}>
          <kbd>{touch ? '✋' : 'E'}</kbd>
          {near === 'computer' || (near === 'airlock' && !action) ? t('hud.baseComputer') : near === 'airlock' ? '🏠' : '🔧'}
        </button>
      )}

      {free && (
        <div className="corner-actions">
          <button type="button" className="round-btn" title={t('hud.baseComputer')} onClick={() => (sfx('click'), useGame.getState().openModal('computer'))}>
            🖥
            {compDist > 4 && <span className="dist">{n(compDist)} m</span>}
          </button>
          <button type="button" className="round-btn log-btn" title={t('hud.log')} aria-label={t('hud.log')} onClick={() => (sfx('click'), useGame.getState().setLog(!logOpen))}>
            📋
          </button>
          <button type="button" className="round-btn primary" title={t('hud.sleep')} aria-label={t('hud.sleep')} onClick={() => (sfx('night'), useGame.getState().endSol())}>
            🌙
          </button>
        </div>
      )}
      {logOpen && !modal && <MissionLog game={game} now={m} target={target} />}
      <Toast />
      {touch && <Joystick />}
      {!touch && helpVisible && <div className="help">{t('hud.help')}</div>}
    </div>
  );
}
