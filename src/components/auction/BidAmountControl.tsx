"use client";

import { Kbd } from "@/components/ui/Kbd";
import { BID_STEP } from "@/lib/auction";
import { formatCompact, formatPrice } from "@/lib/format";

interface Props {
  /** The amount as typed, in lakh. */
  lakh: string;
  amount: number;
  error: string | null;
  canDecrease: boolean;
  busy: boolean;
  onChange: (lakh: string) => void;
  onStep: (direction: 1 | -1) => void;
}

/** Sets the next bid: − / + move it by 1 lakh, or type the full amount. */
export function BidAmountControl({ lakh, amount, error, canDecrease, busy, onChange, onStep }: Props) {
  return (
    <div className="card p-4 2xl:p-6">
      <label htmlFor="bid-amount" className="block text-center text-xs font-semibold uppercase tracking-widest text-muted 2xl:text-base">
        Next bid (₹ lakh)
      </label>
      <div className="mt-2 flex items-stretch gap-3">
        <button
          type="button"
          disabled={busy || !canDecrease}
          onClick={() => onStep(-1)}
          aria-label={`Lower the bid by ${formatCompact(BID_STEP)}`}
          className="btn-outline min-h-[64px] min-w-[72px] flex-col gap-0.5 font-display text-4xl font-extrabold leading-none"
        >
          −<Kbd className="text-xs">-</Kbd>
        </button>
        <input
          id="bid-amount"
          type="number"
          inputMode="decimal"
          min={0}
          step={BID_STEP / 100_000}
          value={lakh}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby="bid-amount-note"
          className="input min-h-[64px] min-w-0 flex-1 text-center font-display text-4xl font-extrabold 2xl:text-5xl"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => onStep(1)}
          aria-label={`Raise the bid by ${formatCompact(BID_STEP)}`}
          className="btn-outline min-h-[64px] min-w-[72px] flex-col gap-0.5 font-display text-4xl font-extrabold leading-none"
        >
          +<Kbd className="text-xs">+</Kbd>
        </button>
      </div>
      <p id="bid-amount-note" role="status" className="mt-2 text-center text-sm 2xl:text-base">
        {error ? (
          <span className="font-medium text-amber-600 dark:text-amber-400">{error}</span>
        ) : (
          <span className="text-muted">
            Teams bid <span className="font-bold text-foreground">{formatCompact(amount)}</span> ({formatPrice(amount)})
          </span>
        )}
      </p>
    </div>
  );
}
