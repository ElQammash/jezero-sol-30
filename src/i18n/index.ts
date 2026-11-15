import ar from './ar';
import en, { type Messages } from './en';

export type Lang = 'en' | 'ar';
export type Gender = 'm' | 'f';
export const MESSAGES: Record<Lang, Messages> = { en, ar };
type Params = Record<string, string | number>;

function lookup(m: unknown, key: string): unknown {
  let node = m;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in (node as object)) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return node;
}

export function fmtNumber(lang: Lang, n: number, digits = 0): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: digits }).format(n);
}

/** Translate with {params}, Arabic gendered address [masc|fem], and Arabic number formatting. */
export function translate(lang: Lang, gender: Gender, key: string, params?: Params): string {
  const v = lookup(MESSAGES[lang], key) ?? lookup(en, key);
  let s = typeof v === 'string' ? v : key;
  s = s.replace(/\[([^|\]]*)\|([^\]]*)\]/g, (_, m: string, f: string) => (gender === 'f' ? f : m));
  if (params)
    s = s.replace(/\{(\w+)\}/g, (_, k: string) => {
      const p = params[k];
      if (p === undefined) return `{${k}}`;
      return typeof p === 'number' ? fmtNumber(lang, p, Number.isInteger(p) ? 0 : 1) : p;
    });
  return s;
}

export function list(lang: Lang, gender: Gender, key: string): string[] {
  const v = lookup(MESSAGES[lang], key);
  return Array.isArray(v) ? (v as string[]).map((x) => x.replace(/\[([^|\]]*)\|([^\]]*)\]/g, (_, m: string, f: string) => (gender === 'f' ? f : m))) : [];
}
