"use client";

import { useCallback, useEffect, useRef } from "react";
import { secureRandomUnit } from "@/lib/random";

export interface WheelPlayer {
  id: number;
  name: string;
  photo_url: string | null;
}

interface Props {
  /** Players on the wheel. Both screens must pass them in the same order. */
  players: WheelPlayer[];
  /** The selected player (already decided) the wheel should point at, or null. */
  targetId: number | null;
  /** Changes on every new spin. While mounted, a change starts the animation. */
  spinId: number;
  /** True while the auction status is "spinning" (otherwise just snap to the target). */
  animate: boolean;
  /** False until the first data has loaded. */
  ready: boolean;
  /** Slice drawn with a white outline (the player currently on the block). */
  highlightId: number | null;
  emoji: string;
  /** Slice colours; defaults to a bright rainbow. */
  palette?: string[];
  onSpinStart?: () => void;
  /** Called when the wheel is at rest on `spinId` (after animating, or on first load). */
  onSettled?: (spinId: number) => void;
  onTick?: () => void;
  /** Spin from the button in the centre of the wheel (control screen, when a spin is allowed). */
  onTap?: () => void;
}

const TWO_PI = Math.PI * 2;
const PALETTE = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
/** How long a spin lasts. Fixed (not random) so the control screen and the projector stop together. */
const SPIN_MS = 1000;

const mod = (n: number, m: number) => ((n % m) + m) % m;

function colorFor(i: number, n: number, palette: string[]) {
  // Avoid the last slice having the same colour as the first.
  if (n > 1 && i === n - 1 && i % palette.length === 0) return palette[1];
  return palette[i % palette.length];
}

/** Rotation that puts the middle of slice `index` under the pointer (top). */
function angleFor(index: number, n: number, offsetInSlice = 0) {
  const a = TWO_PI / n;
  return mod(-((index + 0.5) * a + offsetInSlice), TWO_PI);
}

export function SpinWheel(props: Props) {
  const { players, targetId, spinId, animate, ready, highlightId, emoji, palette, onTap } = props;

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef(0);
  const rotation = useRef(0);
  const raf = useRef<number | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinning = useRef(false);
  const seenSpin = useRef<number | null>(null);
  const images = useRef(new Map<string, HTMLImageElement>());
  // Site heading font for the names (falls back to the system font until it has loaded).
  const font = useRef("system-ui, sans-serif");
  const live = useRef(props);
  live.current = props;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const size = sizeRef.current;
    if (!canvas || !size) return;
    const c = canvas.getContext("2d");
    if (!c) return;

    const { players: list, highlightId: highlight, emoji: hubEmoji, palette = PALETTE } = live.current;
    const dpr = window.devicePixelRatio || 1;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, size, size);

    const cx = size / 2;
    const R = size / 2 - 8;
    const n = list.length;

    // Outer rim
    c.beginPath();
    c.arc(cx, cx, R + 6, 0, TWO_PI);
    c.fillStyle = "#0f172a";
    c.fill();

    if (n === 0) {
      c.beginPath();
      c.arc(cx, cx, R, 0, TWO_PI);
      c.fillStyle = "#1e293b";
      c.fill();
      c.fillStyle = "#e2e8f0";
      c.font = `700 ${R * 0.09}px ${font.current}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("No players left", cx, cx);
      return;
    }

    const a = TWO_PI / n;
    const rot = rotation.current;

    // Slices
    for (let i = 0; i < n; i++) {
      const start = rot + i * a - Math.PI / 2;
      c.beginPath();
      c.moveTo(cx, cx);
      c.arc(cx, cx, R, start, start + a);
      c.closePath();
      c.fillStyle = colorFor(i, n, palette);
      c.fill();
      c.lineWidth = n > 60 ? 1 : 2;
      c.strokeStyle = "rgba(255,255,255,0.85)";
      c.stroke();
    }

    // Names and photos, drawn along each slice's centre line
    const arcAt = (r: number) => a * r; // slice thickness at distance r
    const photoR = Math.min(R * 0.1, arcAt(R * 0.84) * 0.42);
    const showPhotos = photoR >= 7;
    const textEnd = showPhotos ? R * 0.84 - photoR - 6 : R * 0.94;
    // Names stop short of the centre SPIN button (about 0.24R) so nothing is drawn under it.
    const textStart = R * 0.3;
    // Text height must fit the slice where the name is narrowest, so neighbouring names never touch.
    const fontPx = Math.max(8, Math.min(R * 0.07, arcAt(R * 0.42) * 0.72));

    for (let i = 0; i < n; i++) {
      const p = list[i];
      const mid = rot + (i + 0.5) * a - Math.PI / 2;
      c.save();
      c.translate(cx, cx);
      c.rotate(mid);

      c.font = `700 ${fontPx}px ${font.current}`;
      c.textAlign = "right";
      c.textBaseline = "middle";
      let label = p.name;
      const maxWidth = textEnd - textStart;
      if (c.measureText(label).width > maxWidth) {
        while (label.length > 3 && c.measureText(label + "…").width > maxWidth) label = label.slice(0, -1);
        label = label.trimEnd() + "…";
      }
      c.lineJoin = "round";
      c.lineWidth = Math.max(2, fontPx / 4);
      c.strokeStyle = "rgba(0,0,0,0.45)";
      c.strokeText(label, textEnd, 0);
      c.fillStyle = "#fff";
      c.fillText(label, textEnd, 0);

      if (showPhotos) {
        const px = R * 0.84;
        c.beginPath();
        c.arc(px, 0, photoR, 0, TWO_PI);
        c.fillStyle = "rgba(255,255,255,0.9)";
        c.fill();
        const img = p.photo_url ? images.current.get(p.photo_url) : undefined;
        if (img && img.complete && img.naturalWidth > 0) {
          c.save();
          c.beginPath();
          c.arc(px, 0, photoR - 1.5, 0, TWO_PI);
          c.clip();
          const s = Math.min(img.naturalWidth, img.naturalHeight);
          c.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 6, s, s, px - photoR, -photoR, photoR * 2, photoR * 2);
          c.restore();
        } else {
          c.fillStyle = "#334155";
          c.font = `800 ${photoR * 0.95}px ${font.current}`;
          c.textAlign = "center";
          c.fillText(p.name.trim()[0]?.toUpperCase() ?? "?", px, 1);
        }
      }
      c.restore();
    }

    // Highlight the player on the block
    const hi = highlight === null ? -1 : list.findIndex((p) => p.id === highlight);
    if (hi >= 0) {
      const start = rot + hi * a - Math.PI / 2;
      c.beginPath();
      c.moveTo(cx, cx);
      c.arc(cx, cx, R - 3, start, start + a);
      c.closePath();
      c.lineWidth = 6;
      c.strokeStyle = "#ffffff";
      c.stroke();
    }

    // Hub
    c.beginPath();
    c.arc(cx, cx, R * 0.15, 0, TWO_PI);
    c.fillStyle = "#0f172a";
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = "#f59e0b";
    c.stroke();
    c.font = `${R * 0.14}px system-ui, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(hubEmoji, cx, cx + 2);
  }, []);

  // Keep the canvas sharp at any size (laptop, projector, phone).
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const size = Math.floor(wrap.clientWidth);
      if (!size) return;
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = size;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      draw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim();
    if (!family) return;
    font.current = `${family}, system-ui, sans-serif`;
    document.fonts.load(`700 16px ${family}`).then(draw, () => undefined);
  }, [draw]);

  // Load photos once; redraw as they arrive.
  useEffect(() => {
    for (const p of players) {
      if (p.photo_url && !images.current.has(p.photo_url)) {
        const img = new Image();
        img.onload = () => draw();
        // A small thumbnail (resized by the site's image service), not the full-size photo:
        // the wheel draws dozens of them at once.
        img.src = p.photo_url.endsWith(".svg") ? p.photo_url : `/_next/image?url=${encodeURIComponent(p.photo_url)}&w=256&q=70`;
        images.current.set(p.photo_url, img);
      }
    }
  }, [players, draw]);

  useEffect(() => {
    draw();
  }, [players, highlightId, emoji, palette, draw]);

  const startSpin = useCallback(
    (index: number, id: number) => {
      const list = live.current.players;
      const n = list.length;
      if (n === 0) return;
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      if (finishTimer.current !== null) clearTimeout(finishTimer.current);

      const a = TWO_PI / n;
      // Land somewhere inside the slice, not always dead centre.
      const jitter = (secureRandomUnit() - 0.5) * a * 0.7;
      const from = rotation.current;
      const delta = mod(angleFor(index, n, jitter) - from, TWO_PI);
      // One or two full turns: a quick spin that still visibly goes round, without turning into a blur.
      const extraTurns = 1 + Math.floor(secureRandomUnit() * 2);
      const to = from + extraTurns * TWO_PI + delta;

      spinning.current = true;
      live.current.onSpinStart?.();

      const t0 = performance.now();
      let lastSlice = -1;
      let lastTick = 0;

      const finish = () => {
        if (!spinning.current) return;
        if (raf.current !== null) cancelAnimationFrame(raf.current);
        if (finishTimer.current !== null) clearTimeout(finishTimer.current);
        raf.current = null;
        finishTimer.current = null;
        rotation.current = mod(to, TWO_PI);
        spinning.current = false;
        draw();
        live.current.onSettled?.(id);
      };

      const frame = () => {
        const now = performance.now();
        const p = Math.min(1, (now - t0) / SPIN_MS);
        const eased = 1 - Math.pow(1 - p, 3); // fast start, smooth slow-down
        rotation.current = from + (to - from) * eased;
        draw();

        const slice = Math.floor(mod(-rotation.current, TWO_PI) / a);
        if (slice !== lastSlice) {
          lastSlice = slice;
          if (now - lastTick > 45) {
            lastTick = now;
            live.current.onTick?.();
          }
        }

        if (p < 1) raf.current = requestAnimationFrame(frame);
        else finish();
      };
      raf.current = requestAnimationFrame(frame);
      // Browsers pause animation frames in background tabs; make sure the spin
      // still finishes on time (and lands exactly on the chosen player).
      finishTimer.current = setTimeout(finish, SPIN_MS + 300);
    },
    [draw],
  );

  // Decide what to do when the shared state changes.
  useEffect(() => {
    if (!ready) return;
    const index = players.findIndex((p) => p.id === targetId);

    if (seenSpin.current === null) {
      // First load (e.g. a page refresh): show the final position, no animation.
      seenSpin.current = spinId;
      if (index >= 0) rotation.current = angleFor(index, players.length);
      draw();
      live.current.onSettled?.(spinId);
      return;
    }
    if (spinId !== seenSpin.current) {
      seenSpin.current = spinId;
      if (animate && index >= 0) {
        startSpin(index, spinId);
      } else {
        if (index >= 0) rotation.current = angleFor(index, players.length);
        draw();
        live.current.onSettled?.(spinId);
      }
    }
  }, [ready, spinId, targetId, animate, players, draw, startSpin]);

  useEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      if (finishTimer.current !== null) clearTimeout(finishTimer.current);
    },
    [],
  );

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto aspect-square w-full"
      // Small enough that the wheel, its tabs and the Spin button fit on one laptop screen.
      style={{ maxWidth: "min(100%, 62vh)" }}
    >
      {/* Pointer */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 -translate-y-[10%] border-x-[16px] border-t-[34px] border-x-transparent border-t-white drop-shadow-[0_3px_3px_rgba(0,0,0,0.6)]"
      />
      <canvas ref={canvasRef} role="img" aria-label="Player wheel" className="rounded-full" />
      {/* Centre button: the only part of the wheel that spins it (no accidental spins) */}
      {onTap && (
        <button
          type="button"
          onClick={onTap}
          aria-label="Spin the wheel"
          className="absolute left-1/2 top-1/2 z-10 flex aspect-square w-[22%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[5px] border-amber-400 bg-slate-900 text-white shadow-[0_0_0_6px_rgba(0,0,0,0.25)] transition hover:scale-105 active:scale-95"
        >
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-amber-400/25" />
          <span aria-hidden className="relative text-[clamp(1rem,3vw,2.2rem)] leading-none">{emoji}</span>
          <span className="relative font-display text-[clamp(0.9rem,2.2vw,1.8rem)] font-extrabold uppercase tracking-widest">Spin</span>
        </button>
      )}
    </div>
  );
}
