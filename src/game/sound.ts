/** Synthesised sound (no audio files): Mars wind ambience, alarms and UI clicks. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wind: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.1);
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < d.length; i++) {
    b = 0.985 * b + 0.015 * (Math.random() * 2 - 1); // brown-ish noise
    d[i] = b * 6;
  }
  return buf;
}

const buffers: Record<string, AudioBuffer> = {};
async function loadBuffer(c: AudioContext, url: string): Promise<AudioBuffer | null> {
  if (buffers[url]) return buffers[url];
  try {
    const data = await fetch(url).then((r) => r.arrayBuffer());
    buffers[url] = await c.decodeAudioData(data);
    return buffers[url];
  } catch {
    return null;
  }
}

/** Real wind recorded on Mars by NASA Perseverance's microphone (NASA/JPL-Caltech), looped. */
async function startRealWind(c: AudioContext) {
  const buf = await loadBuffer(c, './audio/mars-wind.mp3');
  if (!buf || !master) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = c.createGain();
  g.gain.value = 0.9;
  src.connect(g).connect(master);
  src.start();
}

/** NASA recording of Perseverance driving on Mars (sol 16), used when the rover comes back. */
export async function playRover() {
  const c = ac();
  if (!c || !master || muted) return;
  const buf = await loadBuffer(c, './audio/rover-drive.mp3');
  if (!buf) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = 0.7;
  src.connect(g).connect(master);
  src.start(0, 0, 8);
}

/** Thin-air wind: Mars sounds are quiet and muffled (low pressure). */
export function startAmbience() {
  const c = ac();
  if (!c || !master || wind) return;
  void startRealWind(c);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 6);
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 380;
  const gain = c.createGain();
  gain.gain.value = 0.12;
  src.connect(filter).connect(gain).connect(master);
  src.start();
  wind = { src, gain, filter };
}

export function setStorm(level: number) {
  if (!wind || !ctx) return;
  wind.gain.gain.setTargetAtTime(0.12 + level * 0.5, ctx.currentTime, 0.8);
  wind.filter.frequency.setTargetAtTime(380 + level * 900, ctx.currentTime, 0.8);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, to?: number) {
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export type Sfx = 'click' | 'alarm' | 'confirm' | 'good' | 'bad' | 'night' | 'win' | 'lose' | 'tick';
export function sfx(s: Sfx) {
  if (muted) return;
  switch (s) {
    case 'click':
      return tone(700, 0, 0.05, 'triangle', 0.06);
    case 'tick':
      return tone(1200, 0, 0.04, 'square', 0.03);
    case 'confirm':
      tone(440, 0, 0.12, 'triangle', 0.08);
      return tone(660, 0.1, 0.18, 'triangle', 0.08);
    case 'alarm':
      for (let i = 0; i < 3; i++) {
        tone(880, i * 0.42, 0.2, 'sawtooth', 0.05);
        tone(620, i * 0.42 + 0.21, 0.2, 'sawtooth', 0.05);
      }
      return;
    case 'good':
      tone(523, 0, 0.18, 'sine', 0.1);
      return tone(784, 0.14, 0.3, 'sine', 0.1);
    case 'bad':
      tone(330, 0, 0.3, 'sine', 0.1);
      return tone(247, 0.25, 0.5, 'sine', 0.1);
    case 'night':
      return tone(220, 0, 1.6, 'sine', 0.05, 110);
    case 'win':
      return [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.18, 0.6, 'triangle', 0.1));
    case 'lose':
      return [392, 311, 262, 196].forEach((f, i) => tone(f, i * 0.3, 0.7, 'sine', 0.1));
  }
}
