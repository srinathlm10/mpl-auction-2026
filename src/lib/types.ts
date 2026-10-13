export type PlayerStatus = "available" | "sold" | "unsold";

export const PLAYER_STATUSES: PlayerStatus[] = ["available", "sold", "unsold"];

export interface Sport {
  id: number;
  name: string;
  slug: string;
  /** Players each team must buy (setting, changeable in Admin → Settings). */
  squad_size: number;
}

export interface Team {
  id: number;
  name: string;
  sport_id: number;
  logo_url: string | null;
  captain: string;
  total_purse: number;
  /** Calculated in lib/data.ts from the players the team has bought. */
  remaining_purse: number;
}

export interface Player {
  id: number;
  name: string;
  sport_id: number;
  batch: string;
  role_or_position: string;
  /** Sport-specific ratings, e.g. { batting: 8, bowling: 5 } */
  skills: Record<string, number>;
  /** Sport-specific text details, e.g. { bowling_action: "Round arm" } */
  attributes: Record<string, string>;
  photo_url: string | null;
  base_price: number;
  status: PlayerStatus;
  team_id: number | null;
  sold_price: number | null;
}

export type TeamWithPlayers = Team & { players: Player[] };

/* ------------------------------------------------------------ live auction */

export type AuctionStatus = "idle" | "spinning" | "bidding" | "sold" | "unsold";

export interface AuctionState {
  id: number;
  sport_id: number | null;
  current_player_id: number | null;
  current_bid: number | null;
  highest_team_id: number | null;
  status: AuctionStatus;
  /** Increases on every spin so each screen animates a spin exactly once. */
  spin_id: number;
  updated_at: string;
}

export interface BidSlab {
  /** Slab applies while the current bid is below this amount; null = no upper limit. */
  up_to: number | null;
  step: number;
}

export interface AuctionSettings {
  id: number;
  base_price: number;
  increment_slabs: BidSlab[];
}

export interface Bid {
  id: number;
  player_id: number;
  team_id: number;
  amount: number;
  created_at: string;
  voided_at: string | null;
}

/** Everything the auction screens need, refreshed together. */
export interface AuctionSnapshot {
  state: AuctionState;
  settings: AuctionSettings;
  sports: Sport[];
  teams: Team[];
  players: Player[];
  /** Active (not undone) bids of the player currently on the block, newest first. */
  bids: Bid[];
}
