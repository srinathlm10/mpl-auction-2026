import { cache } from "react";
import playersJson from "@/data/players.json";
import sportsJson from "@/data/sports.json";
import teamsJson from "@/data/teams.json";
import { createPublicClient } from "./supabase/public";
import type { Player, Sport, Team, TeamWithPlayers } from "./types";

/**
 * Read-only data for the public pages. With Supabase configured the data comes
 * from the database (so auction results show up); otherwise it comes from the
 * JSON files in src/data. Pages never need to care which.
 */

const sampleSports = sportsJson as Sport[];
const samplePlayers = playersJson as unknown as Player[];
// remaining purse = total purse - prices of the players the team has bought
const sampleTeams: Team[] = (teamsJson as Omit<Team, "remaining_purse">[]).map((team) => ({
  ...team,
  remaining_purse:
    team.total_purse -
    samplePlayers
      .filter((p) => p.team_id === team.id && p.status === "sold")
      .reduce((sum, p) => sum + (p.sold_price ?? 0), 0),
}));

function fail(what: string, message: string): never {
  throw new Error(`Failed to load ${what}: ${message}`);
}

export const getSports = cache(async (): Promise<Sport[]> => {
  const db = createPublicClient();
  if (!db) return sampleSports;
  const { data, error } = await db.from("sports").select("*").order("id");
  if (error) fail("sports", error.message);
  return (data ?? []) as Sport[];
});

export const getSportBySlug = cache(async (slug: string): Promise<Sport | undefined> => {
  return (await getSports()).find((s) => s.slug === slug);
});

export const getPlayers = cache(async (sportId?: number): Promise<Player[]> => {
  const db = createPublicClient();
  if (!db) return samplePlayers.filter((p) => sportId === undefined || p.sport_id === sportId);
  let query = db.from("players").select("*").order("name");
  if (sportId !== undefined) query = query.eq("sport_id", sportId);
  const { data, error } = await query;
  if (error) fail("players", error.message);
  return (data ?? []) as Player[];
});

export const getPlayer = cache(async (id: number): Promise<Player | undefined> => {
  const db = createPublicClient();
  if (!db) return samplePlayers.find((p) => p.id === id);
  const { data, error } = await db.from("players").select("*").eq("id", id).maybeSingle();
  if (error) fail("player", error.message);
  return (data ?? undefined) as Player | undefined;
});

export const getTeams = cache(async (sportId?: number): Promise<Team[]> => {
  const db = createPublicClient();
  if (!db) return sampleTeams.filter((t) => sportId === undefined || t.sport_id === sportId);
  let query = db.from("teams").select("*").order("name");
  if (sportId !== undefined) query = query.eq("sport_id", sportId);
  const { data, error } = await query;
  if (error) fail("teams", error.message);
  return (data ?? []) as Team[];
});

export const getTeam = cache(async (id: number): Promise<Team | undefined> => {
  return (await getTeams()).find((t) => t.id === id);
});

/** Teams with the players they bought (status = sold). */
export const getTeamsWithPlayers = cache(async (): Promise<TeamWithPlayers[]> => {
  const [teams, players] = await Promise.all([getTeams(), getPlayers()]);
  return teams.map((team) => ({
    ...team,
    players: players.filter((p) => p.team_id === team.id && p.status === "sold"),
  }));
});

export interface SiteStats {
  players: number;
  teams: number;
  sold: number;
  available: number;
  unsold: number;
}

export const getSiteStats = cache(async (): Promise<SiteStats> => {
  const [players, teams] = await Promise.all([getPlayers(), getTeams()]);
  const count = (status: Player["status"]) => players.filter((p) => p.status === status).length;
  return {
    players: players.length,
    teams: teams.length,
    sold: count("sold"),
    available: count("available"),
    unsold: count("unsold"),
  };
});
