import { db } from './store';

// Tiny base64-encoded sounds (short beeps/chimes generated procedurally)
// Using Web Audio API for zero-dependency sound

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function isSoundEnabled(): boolean {
  const cfg = db.get<{ soundEnabled?: boolean }>('ops_config');
  return cfg?.soundEnabled !== false; // default on
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.15): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

export function playSuccess(): void {
  playTone(523, 0.15, 'sine');
  setTimeout(() => playTone(659, 0.15, 'sine'), 100);
  setTimeout(() => playTone(784, 0.2, 'sine'), 200);
}

export function playSale(): void {
  playTone(523, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.2), 80);
  setTimeout(() => playTone(784, 0.1, 'sine', 0.2), 160);
  setTimeout(() => playTone(1047, 0.3, 'sine', 0.2), 240);
}

export function playLevelUp(): void {
  const notes = [523, 587, 659, 784, 880, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.12, 'sine', 0.12), i * 70);
  });
}

export function playAchievement(): void {
  playTone(880, 0.15, 'triangle', 0.15);
  setTimeout(() => playTone(1108, 0.15, 'triangle', 0.15), 120);
  setTimeout(() => playTone(1318, 0.3, 'triangle', 0.15), 240);
}

export function playNotification(): void {
  playTone(880, 0.08, 'sine', 0.08);
  setTimeout(() => playTone(1108, 0.12, 'sine', 0.08), 100);
}
