import { describe, expect, it } from 'vitest';
import { OPTION_PREVIEWS, STAGE_ORDER } from '../engine';
import ar from './ar';
import en from './en';
import { translate } from './index';

function keys(o: unknown, p = ''): string[] {
  if (typeof o !== 'object' || o === null || Array.isArray(o)) return [p];
  return Object.entries(o).flatMap(([k, v]) => keys(v, p ? `${p}.${k}` : k));
}
const get = (o: unknown, k: string) => k.split('.').reduce((a: unknown, x) => (a as Record<string, unknown>)[x], o);

describe('translations', () => {
  it('Arabic has exactly the English keys', () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });
  it('keeps the same {placeholders}', () => {
    for (const k of keys(en)) {
      const e = get(en, k);
      if (typeof e !== 'string') continue;
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      expect(ph(get(ar, k) as string), k).toBe(ph(e));
    }
  });
  it('has a title and text for every stage option', () => {
    for (const stage of STAGE_ORDER)
      for (const o of OPTION_PREVIEWS[stage]) {
        expect(translate('ar', 'm', `stages.${stage}.${o.id}.title`)).not.toContain('stages.');
        expect(translate('en', 'm', `stages.${stage}.${o.id}.desc`)).not.toContain('stages.');
      }
  });
  it('picks the masculine or feminine form for the commander in Arabic', () => {
    expect(translate('ar', 'm', 'objectives.shelter')).toContain('اركض');
    expect(translate('ar', 'f', 'objectives.shelter')).toContain('اركضي');
    expect(translate('ar', 'f', 'objectives.shelter')).not.toContain('[');
  });
});
