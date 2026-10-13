import playersJson from "@/data/players.json";
import sportsJson from "@/data/sports.json";
import teamsJson from "@/data/teams.json";
import type { Player, Sport, Team, TeamWithPlayers } from "./types";

/**
 * All site data comes from the JSON files in src/data (sports, teams, players).
 * Edit those files and redeploy – there is no database or admin area.
 */

const sports = sportsJson as Sport[];
const players = playersJson as unknown as Player[];

// remaining purse = total purse - the prices of players the team has bought
const teams: Team[] = (teamsJson as Omit<Team, "remaining_purse">[]).map((team) => ({
  ...team,
  remaining_purse:
    team.total_purse -
    players
      .filter((p) => p.team_id === team.id && p.status === "sold")
      .reduce((sum, p) => sum + (p.sold_price ?? 0), 0),
}));

export const getSports = (): Sport[] => sports;

export const getSportBySlug = (slug: string): Sport | undefined => sports.find((s) => s.slug === slug);

export const getPlayers = (sportId?: number): Player[] =>
  players.filter((p) => sportId === undefined || p.sport_id === sportId);

export const getPlayer = (id: number): Player | undefined => players.find((p) => p.id === id);

export const getTeams = (sportId?: number): Team[] =>
  teams.filter((t) => sportId === undefined || t.sport_id === sportId);

/** Teams with the players they bought (status = sold). */
export const getTeamsWithPlayers = (): TeamWithPlayers[] =>
  teams.map((team) => ({
    ...team,
    players: players.filter((p) => p.team_id === team.id && p.status === "sold"),
  }));

export interface SiteStats {
  players: number;
  teams: number;
  sold: number;
  available: number;
  unsold: number;
}

export const getSiteStats = (): SiteStats => {
  const count = (status: Player["status"]) => players.filter((p) => p.status === status).length;
  return {
    players: players.length,
    teams: teams.length,
    sold: count("sold"),
    available: count("available"),
    unsold: count("unsold"),
  };
};
