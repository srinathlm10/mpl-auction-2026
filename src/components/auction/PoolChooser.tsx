"use client";

import type { WheelPool } from "@/lib/sports";

interface Props {
  pools: WheelPool[];
  /** Players still on each wheel, by pool key. */
  counts: Record<string, number>;
  /** Control screen: the cards are buttons. Projector: just a waiting message. */
  admin: boolean;
  busy: boolean;
  onChoose: (key: string) => void;
}

/** "Which wheel?" step for sports with more than one wheel (cricket: batsmen / bowlers). */
export function PoolChooser({ pools, counts, admin, busy, onChoose }: Props) {
  return (
    <div className="py-4 text-center">
      <h2 className="font-display text-4xl font-extrabold uppercase tracking-wide 2xl:text-6xl">
        {admin ? "Choose a wheel" : "Choosing the next wheel…"}
      </h2>
      <p className="mt-1 text-muted 2xl:text-xl">Each wheel is auctioned separately. You can switch at any time between players.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {pools.map((pool) => {
          const left = counts[pool.key] ?? 0;
          const body = (
            <>
              <div
                aria-hidden
                className="absolute inset-0 opacity-25 transition group-hover:opacity-40"
                style={{ background: `linear-gradient(135deg, ${pool.palette[0]}, ${pool.palette[2] ?? pool.palette[1]})` }}
              />
              <span className="relative block text-7xl 2xl:text-8xl" aria-hidden>{pool.emoji}</span>
              <span className="relative mt-3 block font-display text-4xl font-extrabold uppercase 2xl:text-6xl">{pool.label}</span>
              <span className="relative mt-1 block text-sm text-muted 2xl:text-lg">{pool.description}</span>
              <span className="relative mt-4 inline-block rounded-full bg-background/70 px-4 py-1 font-display text-xl font-bold 2xl:text-3xl">
                {left} player{left === 1 ? "" : "s"} left
              </span>
            </>
          );
          return admin ? (
            <button
              key={pool.key}
              type="button"
              disabled={busy || left === 0}
              onClick={() => onChoose(pool.key)}
              className="card group relative overflow-hidden p-8 transition hover:-translate-y-1 hover:border-accent disabled:opacity-50 2xl:p-12"
            >
              {body}
            </button>
          ) : (
            <div key={pool.key} className="card relative overflow-hidden p-8 2xl:p-12">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
