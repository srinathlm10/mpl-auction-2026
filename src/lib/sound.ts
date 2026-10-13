/*
 * Auction sounds, synthesised with the Web Audio API (no audio files needed).
 * Browsers only allow audio after a click, so call unlockAudio() from a button
 * press (the admin's buttons do this; the projector page has an "Enable sound" button).
 */

let ctx: AudioContext | null = null;
let muted = false;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    muted = localStorage.getItem("mpl-auction-muted") === "1";
  } catch {
    // storage blocked – start unmuted
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
}

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem("mpl-auction-muted", value ? "1" : "0");
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function subscribeMuted(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function tone(freq: number, start: number, duration: number, type: OscillatorType, volume: number) {
  const c = getCtx();
  if (!c || muted || c.state !== "running") return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noiseBurst(start: number, duration: number, volume: number) {
  const c = getCtx();
  if (!c || muted || c.state !== "running") return;
  const length = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  const gain = c.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(c.currentTime + start);
}

export const sounds = {
  /** Wheel peg clicking past the pointer. */
  tick() {
    tone(900, 0, 0.04, "square", 0.05);
  },
  spinStart() {
    tone(220, 0, 0.18, "sawtooth", 0.07);
    tone(330, 0.1, 0.18, "sawtooth", 0.07);
    tone(440, 0.2, 0.22, "sawtooth", 0.07);
  },
  wheelStop() {
    tone(523, 0, 0.18, "triangle", 0.18);
    tone(784, 0.14, 0.3, "triangle", 0.18);
  },
  bid() {
    tone(660, 0, 0.09, "triangle", 0.16);
    tone(880, 0.07, 0.12, "triangle", 0.16);
  },
  sold() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.35, "square", 0.1));
    tone(1047, 0.55, 0.9, "triangle", 0.2);
    noiseBurst(0.5, 1.4, 0.35);
  },
  unsold() {
    tone(330, 0, 0.25, "sawtooth", 0.1);
    tone(262, 0.2, 0.4, "sawtooth", 0.1);
  },
};
