import { useEffect } from 'react';
import { HINTS, type HintId } from '../game/hints';
import { sfx } from '../game/sound';
import { useGame } from '../game/store';
import { useT } from '../game/useT';

const img = (id: HintId, lang: string) => `${import.meta.env.BASE_URL}hints/${id}-${lang}.webp`;

/** A hint card: a real annotated screenshot, one short sentence and "Got it". Time is paused while it is open. */
export function HintCard() {
  const { t, dir, lang } = useT();
  const hint = useGame((s) => s.hint);
  const dismiss = useGame((s) => s.dismissHint);
  if (!hint) return null;
  return (
    <div className="overlay hint-overlay" dir={dir}>
      <div className="panel hint-card" role="dialog" aria-label={t(`hints.${hint}.title`)}>
        <img src={img(hint, lang)} alt="" width={640} height={360} />
        <h3>💡 {t(`hints.${hint}.title`)}</h3>
        <p>{t(`hints.${hint}.text`)}</p>
        <button type="button" className="btn primary big" onClick={() => (sfx('click'), dismiss())} autoFocus>
          {t('hints.gotIt')}
        </button>
      </div>
    </div>
  );
}

/** All hint cards, any time, from the "?" button, with the hint settings. */
export function HintGallery() {
  const { t, dir, lang } = useT();
  const open = useGame((s) => s.galleryOpen);
  const prefs = useGame((s) => s.hintPrefs);
  const s = useGame.getState();
  if (!open) return null;
  return (
    <div className="overlay" dir={dir} onClick={() => s.setGallery(false)}>
      <div className="panel hint-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="gallery-head">
          <h2>💡 {t('hints.gallery')}</h2>
          <label className="toggle">
            <input type="checkbox" checked={!prefs.off} onChange={(e) => s.setHintsOff(!e.target.checked)} />
            <span>{t('hints.on')}</span>
          </label>
          <button type="button" className="btn small" onClick={() => (sfx('click'), s.resetHints())}>
            ↺ {t('hints.again')}
          </button>
        </div>
        <div className="gallery-grid">
          {HINTS.map((id) => (
            <button
              key={id}
              type="button"
              className="gallery-item"
              onClick={() => {
                sfx('click');
                s.setGallery(false);
                s.openHint(id);
              }}
            >
              <img src={img(id, lang)} alt="" loading="lazy" width={320} height={180} />
              <b>{t(`hints.${id}.title`)}</b>
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={() => s.setGallery(false)}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}

/** Watches the game and pops up each hint the first time its situation happens. */
export function HintDirector() {
  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        const tryHint = s.tryHint;
        if (s.screen === 'end' && prev.screen !== 'end') return void setTimeout(() => useGame.getState().tryHint('debrief'), 1500);
        if (s.screen !== 'play') return;
        if (s.modal === 'stage' && s.game.pendingStage) tryHint('crisis');
        if (s.action?.deadline != null) tryHint('timed');
        if (s.game.storm && !s.modal) tryHint('storm');
        if (s.game.lifeSupport === 'greenhouse' && !s.modal && !s.game.pendingStage) tryHint('crops');
        if (s.game.tasks.length > 0 && !s.modal) tryHint('crew');
        if (s.modal === 'computer') tryHint('computer');
        if (!s.modal && !s.game.pendingStage && s.tutorialStep === null) {
          tryHint('move');
          if (s.game.sol >= 2) tryHint('goal');
          if (s.game.sol >= 2) tryHint('meters');
          if (s.game.sol >= 3) tryHint('speed');
          if (s.game.sol >= 3) tryHint('source');
        }
      }),
    [],
  );
  return null;
}
