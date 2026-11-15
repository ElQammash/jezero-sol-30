import { useEffect } from 'react';
import { availableTasks, commsDelayMinutes, forecast, OPTION_PREVIEWS, STAGE_ORDER, type Cause, type Task } from '../engine';
import { FACT_SOURCES } from '../game/facts';
import { playRover, sfx } from '../game/sound';
import { useGame } from '../game/store';
import { useT } from '../game/useT';
import SourceButton from './SourceButton';

const ICON: Record<string, string> = { power: '⚡', oxygen: '🫁', food: '🥔', shield: '🛡️', water: '💧', time: '⏳', risk: '⚠️', safety: '❤️' };

function Pips({ kind, n, label }: { kind: string; n: number; label: string }) {
  return (
    <span className={`pip pip-${label}`} title={kind}>
      {ICON[kind]}
      <i>{'●'.repeat(n)}</i>
    </span>
  );
}

export function StageModal() {
  const { t, dir } = useT();
  const game = useGame((s) => s.game);
  const choose = useGame((s) => s.choose);
  const stage = game.pendingStage!;
  useEffect(() => sfx('alarm'), [stage]);
  const who = game.crew.filter((c) => c.alive && c.id !== 'commander').reduce((a, b) => (b.health < a.health ? b : a));
  const params = { delay: Math.round(commsDelayMinutes(game)), who: t(`names.${who.id}`) };
  return (
    <div className="overlay" dir={dir}>
      <div className="panel stage-panel">
        <div className="alert-strip">⚠ {t('stage.label', { n: STAGE_ORDER.indexOf(stage) + 1 })}</div>
        <h2>{t(`stages.${stage}.title`)}</h2>
        <p className="situation">{t(`stages.${stage}.situation`, params)}</p>
        <div className="cards">
          {OPTION_PREVIEWS[stage].map((o) => (
            <button
              type="button"
              key={o.id}
              className="card"
              onClick={() => {
                sfx('confirm');
                choose(o.id);
              }}
            >
              <span className="card-letter">{o.id}</span>
              <h3>{t(`stages.${stage}.${o.id}.title`)}</h3>
              <p>{t(`stages.${stage}.${o.id}.desc`)}</p>
              <div className="pips">
                {Object.entries(o.cost).map(([k, v]) => (
                  <Pips key={'c' + k} kind={k} n={v as number} label="cost" />
                ))}
                {Object.entries(o.gain).map(([k, v]) => (
                  <Pips key={'g' + k} kind={k} n={v as number} label="gain" />
                ))}
              </div>
              {o.inWorld && <small className="inworld">🕹 {t('stage.inWorld')}</small>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OutcomeModal() {
  const { t, n, dir } = useT();
  const outcome = useGame((s) => s.outcome)!;
  const close = useGame((s) => s.closeOutcome);
  useEffect(() => {
    sfx(outcome.deaths.length ? 'bad' : outcome.success ? 'good' : 'bad');
    if (outcome.stage === 'mobility' && outcome.success) void playRover();
  }, [outcome]);
  const nameParams = (p?: Record<string, number | string>) => {
    if (!p) return p;
    const q = { ...p };
    if (typeof q.who === 'string') q.who = t(`names.${q.who}`);
    return q;
  };
  return (
    <div className="overlay" dir={dir}>
      <div className="panel outcome-panel">
        <h2>{t(`stages.${outcome.stage}.${outcome.option}.title`)}</h2>
        <ul className="lines">
          {outcome.lines.map((l, i) => (
            <li key={i}>{t(`outcomes.${l.key}`, nameParams(l.params))}</li>
          ))}
        </ul>
        <div className="deltas">
          {Object.entries(outcome.delta).map(([k, v]) =>
            v ? (
              <span key={k} className={`delta ${v > 0 ? 'up' : 'down'}`}>
                {ICON[k]} {v > 0 ? '+' : ''}
                {n(v)}%
              </span>
            ) : null,
          )}
        </div>
        <aside className="fact">
          <h4>🛰 {t('stage.fact')}</h4>
          <p>{t(`facts.${outcome.factKey}`)}</p>
          <SourceButton keys={FACT_SOURCES[outcome.factKey] ?? []} />
        </aside>
        <button type="button" className="btn primary big" onClick={() => (sfx('click'), close())}>
          {t('common.continue')}
        </button>
      </div>
    </div>
  );
}

export function causeText(t: ReturnType<typeof useT>['t'], c: Cause): string {
  const p = { ...(c.params ?? {}) };
  if (c.key === 'failure') p.kind = t(`failures.${p.kind}`);
  if (c.key === 'minorEvent') return t(`minor.${p.kind}`);
  if (typeof p.who === 'string' && !p.who.includes(',')) p.who = t(`names.${p.who}`);
  return t(`causes.${c.key}`, p);
}

export function SolReport() {
  const { t, dir } = useT();
  const report = useGame((s) => s.report)!;
  const close = useGame((s) => s.closeReport);
  const important = report.causes.slice(0, 5);
  return (
    <div className="overlay" dir={dir}>
      <div className="panel report-panel">
        <h2>☀ {t('hud.morning', { n: report.sol + 1 })}</h2>
        <ul className="lines">
          {important.map((c, i) => (
            <li key={i}>{causeText(t, c)}</li>
          ))}
        </ul>
        <button type="button" className="btn primary big" onClick={() => (sfx('click'), close())}>
          {t('common.continue')}
        </button>
      </div>
    </div>
  );
}

const SETTINGS = ['rations', 'heatingLow', 'greenhouseOn', 'icePlantOn', 'moxieOn'] as const;

export function Computer() {
  const { t, n, dir } = useT();
  const game = useGame((s) => s.game);
  const setTasks = useGame((s) => s.setTasks);
  const setSettings = useGame((s) => s.setSettings);
  const close = () => useGame.getState().openModal(null);
  const tasks = availableTasks(game);
  const fc = forecast(game);
  const toggle = (task: Task) => {
    sfx('tick');
    const has = game.tasks.includes(task);
    setTasks(has ? game.tasks.filter((x) => x !== task) : [...game.tasks, task].slice(-2));
  };
  const visibleSettings = SETTINGS.filter(
    (k) => k === 'rations' || k === 'heatingLow' || (k === 'greenhouseOn' && game.lifeSupport === 'greenhouse') || (k === 'icePlantOn' && game.lifeSupport === 'ice' && game.rover !== 'lost') || (k === 'moxieOn' && game.lifeSupport === 'moxie'),
  );
  return (
    <div className="overlay" dir={dir} onClick={close}>
      <div className="panel computer-panel" onClick={(e) => e.stopPropagation()}>
        <h2>🖥 {t('hud.baseComputer')}</h2>
        <p className={`forecast ${fc.net < 0 ? 'bad' : ''}`}>
          ⚡ {t('hud.forecast', { make: Math.round(fc.solar + fc.reactor), use: Math.round(fc.totalDemand) })}
        </p>
        {game.storm && <p className="forecast bad">🌪 {t('hud.stormWarn')}</p>}
        <h3>{t('hud.tasks')}</h3>
        <div className="task-grid">
          {tasks.map((task) => (
            <button key={task} type="button" className={`task ${game.tasks.includes(task) ? 'on' : ''}`} onClick={() => toggle(task)}>
              <b>{t(`tasks.${task}.name`)}</b>
              <small>{t(`tasks.${task}.desc`)}</small>
            </button>
          ))}
        </div>
        <h3>{t('hud.systems')}</h3>
        <div className="toggles">
          {visibleSettings.map((k) => (
            <label key={k} className="toggle">
              <input type="checkbox" checked={game.settings[k]} onChange={(e) => (sfx('tick'), setSettings({ [k]: e.target.checked }))} />
              <span>{t(`hud.${k}`)}</span>
              {k === 'greenhouseOn' && <em>{n(110)} kWh</em>}
              {k === 'icePlantOn' && <em>{n(75)} kWh</em>}
              {k === 'moxieOn' && <em>{n(125)} kWh</em>}
            </label>
          ))}
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={close}>
            {t('common.close')}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              sfx('night');
              useGame.getState().endSol();
            }}
          >
            🌙 {t('hud.endSol')}
          </button>
        </div>
      </div>
    </div>
  );
}
