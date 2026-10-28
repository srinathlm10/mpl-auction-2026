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

export function unlockAudio(): Promise<void> {
  const c = getCtx();
  if (c && c.state === "suspended") return c.resume().catch(() => undefined);
  return Promise.resolve();
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

/* ------------------------------------------------------------ live scores */
/*
 * Sounds for the live football / volleyball scores: whistles, a goal horn with a crowd roar, a card
 * sound and volleyball point / set sounds. They are OFF until someone taps the sound button (people
 * follow matches on their phones in public), and that choice is remembered. Separate from the
 * auction's mute setting above.
 */

let liveOn = false;

if (typeof window !== "undefined") {
  try {
    liveOn = localStorage.getItem("mpl-live-sound") === "1";
  } catch {
    // storage blocked – stay off
  }
}

export function isLiveSoundOn() {
  return liveOn;
}

export function setLiveSoundOn(value: boolean) {
  liveOn = value;
  try {
    localStorage.setItem("mpl-live-sound", value ? "1" : "0");
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export const subscribeLiveSound = subscribeMuted;

/** Runs a sound only when live sounds are on, whatever the auction's mute setting is. */
function live(play: () => void) {
  if (!liveOn) return;
  const wasMuted = muted;
  muted = false;
  try {
    play();
  } finally {
    muted = wasMuted;
  }
}

/** A referee's pea whistle: a high tone with a fast trill. */
function whistle(start: number, duration: number, volume = 0.2) {
  const c = getCtx();
  if (!c || c.state !== "running") return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const trill = c.createOscillator();
  const trillDepth = c.createGain();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(2850, t0);
  trill.frequency.value = 36;
  trillDepth.gain.value = 120;
  trill.connect(trillDepth).connect(osc.frequency);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.setValueAtTime(volume, t0 + Math.max(0.03, duration - 0.06));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  trill.start(t0);
  osc.stop(t0 + duration + 0.05);
  trill.stop(t0 + duration + 0.05);
}

/** A stadium crowd: noise that swells quickly and fades away. */
function crowd(start: number, duration: number, volume: number) {
  const c = getCtx();
  if (!c || c.state !== "running") return;
  const length = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    last = last * 0.92 + (Math.random() * 2 - 1) * 0.08; // soft, rumbling noise
    data[i] = last * 6;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.5;
  const gain = c.createGain();
  const t0 = c.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.35);
  gain.gain.setValueAtTime(volume, t0 + duration * 0.45);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

export const liveSounds = {
  /** Shown when someone switches the sound on, so they know it works. */
  preview() {
    live(() => whistle(0, 0.25, 0.12));
  },
  kickOff() {
    live(() => {
      whistle(0, 0.16);
      whistle(0.28, 0.6);
    });
  },
  halfTime() {
    live(() => {
      whistle(0, 0.2);
      whistle(0.3, 0.2);
      whistle(0.6, 0.75);
    });
  },
  fullTime() {
    live(() => {
      whistle(0, 0.5);
      whistle(0.65, 0.5);
      whistle(1.3, 1);
      crowd(0.2, 2.4, 0.12);
    });
  },
  /** Air horn, crowd roar and a short fanfare. */
  goal() {
    live(() => {
      crowd(0, 3.4, 0.35);
      tone(233, 0, 1, "sawtooth", 0.07);
      tone(311, 0, 1, "sawtooth", 0.06);
      tone(349, 0, 1, "sawtooth", 0.05);
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.55 + i * 0.12, 0.3, "square", 0.07));
      tone(1047, 1.05, 0.8, "triangle", 0.12);
    });
  },
  yellowCard() {
    live(() => {
      whistle(0, 0.28);
      tone(180, 0.05, 0.18, "triangle", 0.12);
    });
  },
  redCard() {
    live(() => {
      whistle(0, 0.2);
      whistle(0.28, 0.2);
      whistle(0.56, 0.5);
      tone(130, 0.1, 0.6, "sawtooth", 0.1);
    });
  },
  /** A rally won in volleyball. */
  point() {
    live(() => tone(740, 0, 0.07, "triangle", 0.07));
  },
  setWon() {
    live(() => {
      whistle(0, 0.35);
      [659, 784].forEach((f, i) => tone(f, 0.4 + i * 0.14, 0.3, "triangle", 0.12));
      crowd(0.2, 1.8, 0.14);
    });
  },
  matchWon() {
    live(() => {
      whistle(0, 0.4);
      whistle(0.5, 0.4);
      crowd(0, 3.4, 0.3);
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.5 + i * 0.13, 0.35, "square", 0.08));
    });
  },
};
