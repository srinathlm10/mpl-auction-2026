import raw from "@/data/sample-data.json";
import type { Player, Sport, Team } from "./types";

// The JSON is plain data (sports, teams, players); the cast gives it our types.
const sports = raw.sports as Sport[];
const players = raw.players as unknown as Player[];

// Mirror the database trigger: remaining = total - sum(sold prices).
const teams: Team[] = raw.teams.map((team) => ({
  ...(team as Omit<Team, "remaining_purse">),
  remaining_purse:
    team.total_purse -
    players
      .filter((p) => p.team_id === team.id && p.status === "sold")
      .reduce((sum, p) => sum + (p.sold_price ?? 0), 0),
}));

/** Used by lib/data.ts when Supabase is not configured. */
export const SAMPLE = { sports, teams, players };
