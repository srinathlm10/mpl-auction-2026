import { formatCompact } from "./format";
import type { BidSlab, Team } from "./types";

/*
 * Pure auction rules. The database functions in supabase/auction.sql enforce
 * the same rules; these copies drive what the screens show (next bid amount,
 * disabled buttons and the explanation for them).
 */

export const DEFAULT_SLABS: BidSlab[] = [
  { up_to: 5_000_000, step: 500_000 },
  { up_to: 10_000_000, step: 1_000_000 },
  { up_to: null, step: 2_500_000 },
];

/** How much the next bid adds, given the current bid. */
export function incrementFor(current: number, slabs: BidSlab[]): number {
  for (const slab of slabs) {
    if (slab.up_to === null || current < slab.up_to) return slab.step;
  }
  return slabs[slabs.length - 1]?.step ?? 500_000;
}

export function nextBidAmount(current: number, slabs: BidSlab[]): number {
  return current + incrementFor(current, slabs);
}

export type BidCheck = { ok: true } | { ok: false; reason: string };

interface CheckInput {
  team: Team;
  /** Players the team has already bought. */
  bought: number;
  squadSize: number;
  /** Amount of the bid the team is about to make. */
  amount: number;
  basePrice: number;
  isHighest: boolean;
}

/**
 * A team may bid only if, after paying, its remaining purse still covers the
 * rest of its squad at base price, and its squad is not already full.
 */
export function checkTeamBid({ team, bought, squadSize, amount, basePrice, isHighest }: CheckInput): BidCheck {
  if (isHighest) return { ok: false, reason: "Already the highest bidder" };
  if (bought >= squadSize) return { ok: false, reason: `Squad full (${bought}/${squadSize})` };

  const stillNeeded = squadSize - bought - 1; // players to buy after this one
  const reserve = stillNeeded * basePrice;
  const left = team.remaining_purse - amount;
  if (left < reserve) {
    const maxBid = Math.max(0, team.remaining_purse - reserve);
    return {
      ok: false,
      reason:
        `Can't afford ${formatCompact(amount)}: must keep ${formatCompact(reserve)} for ` +
        `${stillNeeded} more player${stillNeeded === 1 ? "" : "s"} at base price. Max bid ${formatCompact(maxBid)}.`,
    };
  }
  return { ok: true };
}

/** Validates slab rows from the settings form. Returns an error message or null. */
export function validateSlabs(slabs: BidSlab[]): string | null {
  if (slabs.length === 0) return "Add at least one increment slab.";
  let previous = 0;
  for (let i = 0; i < slabs.length; i++) {
    const slab = slabs[i];
    if (!Number.isInteger(slab.step) || slab.step <= 0) return `Slab ${i + 1}: the step must be a positive whole number.`;
    const last = i === slabs.length - 1;
    if (last) {
      if (slab.up_to !== null) return "The last slab must cover every amount above the previous limit.";
    } else {
      if (slab.up_to === null || !Number.isInteger(slab.up_to)) return `Slab ${i + 1}: enter an upper limit.`;
      if (slab.up_to <= previous) return `Slab ${i + 1}: limits must increase from one slab to the next.`;
      previous = slab.up_to;
    }
  }
  return null;
}
