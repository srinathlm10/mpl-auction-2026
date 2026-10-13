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

/** Shape used when creating / updating a player (admin form + CSV import). */
export type PlayerInput = Omit<Player, "id" | "team_id" | "sold_price" | "status"> & {
  status?: PlayerStatus;
  team_id?: number | null;
  sold_price?: number | null;
};
