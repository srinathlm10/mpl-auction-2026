export type PlayerStatus = "available" | "sold" | "unsold";

export const PLAYER_STATUSES: PlayerStatus[] = ["available", "sold", "unsold"];

export interface Sport {
  id: number;
  name: string;
  slug: string;
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
  photo_url: string | null;
  base_price: number;
  status: PlayerStatus;
  team_id: number | null;
  sold_price: number | null;
}

export type TeamWithPlayers = Team & { players: Player[] };
