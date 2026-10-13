"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
}

const COLORS = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];

/**
 * Full-screen confetti. Increase `burst` to fire it; `big` makes a longer,
 * heavier celebration (used for SOLD).
 */
export function Confetti({ burst, big = false }: { burst: number; big?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (burst === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = big ? 260 : 110;
    const duration = big ? 5000 : 2600;
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -1 : -1) * (Math.PI / 2) + (Math.random() - 0.5) * 1.1 + (fromLeft ? 0.45 : -0.45);
      const speed = (big ? 15 : 11) + Math.random() * (big ? 14 : 8);
      return {
        x: fromLeft ? w * 0.08 : w * 0.92,
        y: h * 0.95,
        vx: Math.cos(angle) * speed * (fromLeft ? 1 : 1),
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = now - t0;
      c.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.vy += 0.32; // gravity
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - duration * 0.6) / (duration * 0.4));
        c.fillStyle = p.color;
        c.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        c.restore();
      }
      if (elapsed < duration) frame = requestAnimationFrame(tick);
      else c.clearRect(0, 0, w, h);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      c.clearRect(0, 0, w, h);
    };
  }, [burst, big]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />;
}
