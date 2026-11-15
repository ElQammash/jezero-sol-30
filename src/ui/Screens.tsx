import { useEffect, useMemo, useState } from 'react';
import { analyzeMission, starsFor } from '../engine';
import { sfx, startAmbience } from '../game/sound';
import { useGame } from '../game/store';
import { useT } from '../game/useT';
import Account from './Account';

export function TitleScreen() {
  const { t, dir } = useT();
  const s = useGame();
  const canResume = s.game.history.length > 0 && s.game.status === 'playing';
  const [account, setAccount] = useState(false);
  return (
    <div className="title-screen" dir={dir}>
      <div className="title-box">
        <div className="kicker">NASA SPACE APPS 2026 · ASTRAQUEST</div>
        <h1>{t('title.name')}</h1>
        <p className="tagline">{t('title.tagline')}</p>
        <div className="choice-row">
          <span>{t('title.commander')}</span>
          <button type="button" className={`chip ${s.gender === 'm' ? 'on' : ''}`} onClick={() => s.setGender('m')}>
            👨‍🚀 {s.lang === 'ar' ? 'قائد المهمة' : t('title.male')}
          </button>
          <button type="button" className={`chip ${s.gender === 'f' ? 'on' : ''}`} onClick={() => s.setGender('f')}>
            👩‍🚀 {s.lang === 'ar' ? 'قائدة المهمة' : t('title.female')}
          </button>
        </div>
        <div className="choice-row">
          <span>{t('title.quality')}</span>
          {(['low', 'medium', 'high'] as const).map((q) => (
            <button type="button" key={q} className={`chip ${s.quality === q ? 'on' : ''}`} onClick={() => s.setQuality(q)}>
              {t(`title.${q}`)}
            </button>
          ))}
          <button type="button" className="chip" onClick={() => s.setLang(s.lang === 'en' ? 'ar' : 'en')}>
            🌐 {t('meta.switchTo')}
          </button>
        </div>
        <div className="row">
          {canResume && (
            <button type="button" className="btn big" onClick={() => (startAmbience(), sfx('confirm'), s.goto('play'))}>
              ▶ {t('title.resume', { sol: s.game.sol })}
            </button>
          )}
          <button type="button" className="btn primary big" onClick={() => (startAmbience(), sfx('confirm'), s.newMission())}>
            🚀 {t('title.start')}
          </button>
        </div>
        <button type="button" className="chip" onClick={() => setAccount(true)}>
          ☁ {t('account.button')}
        </button>
        {account && <Account onClose={() => setAccount(false)} />}
        <p className="real-data">🛰 {t('title.realData')}</p>
        <small className="credits">{t('title.credits')}</small>
      </div>
    </div>
  );
}

export function Intro() {
  const { l, t, dir } = useT();
  const lines = l('intro');
  const [i, setI] = useState(0);
  const goto = useGame((s) => s.goto);
  useEffect(() => {
    if (i >= lines.length) return;
    const id = setTimeout(() => setI((x) => x + 1), 3600);
    return () => clearTimeout(id);
  }, [i, lines.length]);
  return (
    <div className="intro" dir={dir} onClick={() => (i >= lines.length - 1 ? goto('play') : setI(i + 1))}>
      <div className="intro-lines">
        {lines.slice(0, i + 1).map((line, k) => (
          <p key={k} className={k === i ? 'fresh' : ''}>
            {line}
          </p>
        ))}
      </div>
      <button type="button" className="btn primary" onClick={(e) => (e.stopPropagation(), goto('play'))}>
        {i >= lines.length - 1 ? t('common.continue') : t('common.skip')} ▸
      </button>
    </div>
  );
}

export function EndScreen() {
  const { t, n, dir } = useT();
  const game = useGame((s) => s.game);
  const retry = useGame((s) => s.retry);
  const newMission = useGame((s) => s.newMission);
  const won = game.status === 'won';
  const stars = starsFor(game);
  const [debrief, setDebrief] = useState<ReturnType<typeof analyzeMission> | null>(null);
  useEffect(() => {
    sfx(won ? 'win' : 'lose');
    // replays are heavy: run after the screen has painted
    const id = setTimeout(() => setDebrief(analyzeMission(game, 10)), 60);
    return () => clearTimeout(id);
  }, [game, won]);
  const d = debrief?.decisive;
  const optTitle = (stage: string, o: string) => t(`stages.${stage}.${o}.title`);
  const stageName = (stage: string) => t(`stages.${stage}.title`).split(':')[0];
  const series = useMemo(() => game.history.map((h) => h.meters), [game.history]);
  const W = 560, H = 140;
  const line = (k: 'power' | 'oxygen' | 'food' | 'shield') =>
    series.map((m, i) => `${i ? 'L' : 'M'}${(10 + (i / Math.max(1, 29)) * (W - 20)).toFixed(1)},${(H - 10 - (m[k] / 100) * (H - 20)).toFixed(1)}`).join(' ');
  return (
    <div className="overlay end" dir={dir}>
      <div className={`panel end-panel ${won ? 'won' : 'lost'}`}>
        <h1>{won ? `🏆 ${t('end.won')}` : `💥 ${t('end.lost')}`}</h1>
        <p className="end-text">{won ? t('end.wonText') : t(`end.lossReason.${game.lossReason}`)}</p>
        {won && <div className="stars">{'★'.repeat(stars)}<span>{'★'.repeat(3 - stars)}</span></div>}
        <section className="key">
          <h3>🔎 {t('end.keyDecision')}</h3>
          {!debrief && <p className="muted">…</p>}
          {d && (
            <p className="big">
              {won
                ? t('end.winLine', { sol: d.sol, stage: stageName(d.stage), chosen: optTitle(d.stage, d.chosen) })
                : t('end.lossLine', { sol: d.sol, stage: stageName(d.stage), chosen: optTitle(d.stage, d.chosen), best: optTitle(d.stage, d.best), pct: Math.round(d.scores[d.best] * 100) })}
            </p>
          )}
        </section>
        <section>
          <h3>{t('end.timeline')}</h3>
          <svg viewBox={`0 0 ${W} ${H}`} className="chart">
            {(['power', 'oxygen', 'food', 'shield'] as const).map((k) => (
              <path key={k} d={line(k)} className={`ln ln-${k}`} />
            ))}
            {game.stageLog.map((s) => (
              <g key={s.stage}>
                <line x1={10 + ((s.sol - 1) / 29) * (W - 20)} x2={10 + ((s.sol - 1) / 29) * (W - 20)} y1={8} y2={H - 8} className={`mark ${d?.stage === s.stage ? 'key' : ''}`} />
              </g>
            ))}
          </svg>
          <div className="legend">
            {(['power', 'oxygen', 'food', 'shield'] as const).map((k) => (
              <span key={k} className={`lg lg-${k}`}>■ {t(`meters.${k}`)}</span>
            ))}
            <span>· {n(game.history.length)} / 30</span>
          </div>
        </section>
        <div className="row">
          {d && (
            <button type="button" className="btn primary big" onClick={() => (sfx('confirm'), retry(d.stage))}>
              ↺ {t('end.retry')}
            </button>
          )}
          <button type="button" className="btn big" onClick={() => (sfx('confirm'), newMission())}>
            🚀 {t('end.restart')}
          </button>
        </div>
      </div>
    </div>
  );
}
