import { useCallback } from 'react';
import { fmtNumber, list, translate } from '../i18n';
import { useGame } from './store';

export function useT() {
  const lang = useGame((s) => s.lang);
  const gender = useGame((s) => s.gender);
  const t = useCallback((key: string, params?: Record<string, string | number>) => translate(lang, gender, key, params), [lang, gender]);
  const n = useCallback((x: number, d = 0) => fmtNumber(lang, x, d), [lang]);
  const l = useCallback((key: string) => list(lang, gender, key), [lang, gender]);
  return { t, n, l, lang, gender, dir: lang === 'ar' ? 'rtl' : 'ltr' } as const;
}
