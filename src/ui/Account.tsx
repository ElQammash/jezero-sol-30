import { useState } from 'react';
import { cloudUser, fetchCloud, signIn, signOut } from '../game/cloud';
import { applyCloudSave, localUpdatedAt, useGame } from '../game/store';
import { useT } from '../game/useT';

/** Optional account: username + password only (no email, no personal data). */
export default function Account({ onClose }: { onClose: () => void }) {
  const { t, dir } = useT();
  const [user, setUser] = useState(cloudUser());
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async (kind: 'login' | 'register') => {
    setBusy(true);
    setMsg(null);
    try {
      const u = await signIn(kind, name.trim(), pass);
      setUser(u);
      setPass('');
      const remote = await fetchCloud().catch(() => null);
      if (remote && remote.updatedAt > localUpdatedAt()) applyCloudSave(remote);
      else useGame.getState().setMuted(useGame.getState().muted); // triggers a save push
      setMsg(t('account.synced'));
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setMsg(/fetch|network|JSON|HTTP 404|not available/i.test(m) ? t('account.unavailable') : t('account.error', { msg: m }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay top" dir={dir} onClick={onClose}>
      <div className="panel account-panel" onClick={(e) => e.stopPropagation()}>
        <h2>☁ {t('account.title')}</h2>
        <p className="muted">{t('account.intro')}</p>
        {user ? (
          <>
            <p>
              <b>{t('account.loggedIn', { name: user })}</b>
            </p>
            <button type="button" className="btn" onClick={() => (signOut(), setUser(null))}>
              {t('account.logout')}
            </button>
          </>
        ) : (
          <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              void go('login');
            }}
          >
            <label>
              {t('account.username')}
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_\-]+" required dir="ltr" />
            </label>
            <label>
              {t('account.password')}
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" minLength={6} required dir="ltr" />
            </label>
            <div className="row">
              <button type="submit" className="btn primary" disabled={busy}>
                {t('account.login')}
              </button>
              <button type="button" className="btn" disabled={busy || name.length < 3 || pass.length < 6} onClick={() => void go('register')}>
                {t('account.register')}
              </button>
            </div>
          </form>
        )}
        {msg && <p className="msg">{msg}</p>}
        <div className="row">
          <button type="button" className="btn" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
