import playersJson from "@/data/players.json";
import sportsJson from "@/data/sports.json";
import teamsJson from "@/data/teams.json";
import type { Player, Sport, Team } from "./types";

/*
 * All player, team and sport details live in src/data/*.json (photos and logos
 * in public/players and public/teams). Edit those files and redeploy; there is
 * no database. Auction results are kept by the browser running the auction
 * (see lib/local-auction.ts) and laid over this data on screen.
 */

type PlayerJson = Partial<Player> & Pick<Player, "id" | "name" | "sport_id">;

export const baseSports: Sport[] = sportsJson as Sport[];

/** Players as written in players.json, with every optional field filled in. */
export const basePlayers: Player[] = (playersJson as PlayerJson[]).map((p) => ({
  batch: "",
  role_or_position: "",
  skills: {},
  attributes: {},
  photo_url: null,
  base_price: 100_000,
  ...p,
  status: "available",
  team_id: null,
  sold_price: null,
}));

export const baseTeams: Team[] = (teamsJson as Omit<Team, "remaining_purse">[]).map((t) => ({
  ...t,
  remaining_purse: t.total_purse,
}));

export function getSportBySlug(slug: string): Sport | undefined {
  return baseSports.find((s) => s.slug === slug);
}
