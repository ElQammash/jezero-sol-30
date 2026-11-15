/**
 * Optional cloud save. The game is offline-first: localStorage always holds the
 * save. When the player is logged in, the same save is pushed to a tiny PHP API
 * on the same host (public/api). Network errors never block the game.
 */
const API = './api/';
const TOKEN_KEY = 'jezero-token';
const USER_KEY = 'jezero-user';

export interface CloudBlob {
  version: 1 | 2;
  updatedAt: number;
  [k: string]: unknown;
}

function token(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function cloudUser(): string | null {
  try {
    return token() ? localStorage.getItem(USER_KEY) : null;
  } catch {
    return null;
  }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const t = token();
  const res = await fetch(API + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function signIn(kind: 'login' | 'register', username: string, password: string): Promise<string> {
  const r = await call<{ token: string; username: string }>(`${kind}.php`, { username, password });
  localStorage.setItem(TOKEN_KEY, r.token);
  localStorage.setItem(USER_KEY, r.username);
  return r.username;
}

export function signOut(): void {
  if (token()) void call('logout.php', {}).catch(() => undefined);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function fetchCloud(): Promise<CloudBlob | null> {
  return (await call<{ save: CloudBlob | null }>('save.php')).save;
}

let timer: ReturnType<typeof setTimeout> | null = null;
export function pushCloud(blob: CloudBlob): void {
  if (!cloudUser()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void call('save.php', { save: blob }).catch(() => undefined), 1200);
}
