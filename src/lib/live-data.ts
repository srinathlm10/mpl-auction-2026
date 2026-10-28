import fixturesJson from "@/data/fixtures.json";
import { baseTeams } from "./data";
import type { Fixture, LiveSport } from "./live";
import { getSportConfig } from "./sports";
import type { Team } from "./types";

/** The planned matches (src/data/fixtures.json). Their scores come from the live database. */
export const fixtures: Fixture[] = fixturesJson as Fixture[];

export function getFixture(id: string): Fixture | undefined {
  return fixtures.find((f) => f.id === id);
}

export function teamOf(id: number): Team {
  return (
    baseTeams.find((t) => t.id === id) ?? { id, name: "TBA", sport_id: 0, logo_url: null, captain: "", total_purse: 0, remaining_purse: 0 }
  );
}

export function sportInfo(sport: LiveSport) {
  const config = getSportConfig(sport);
  return { name: config.name, emoji: config.emoji, config };
}

export function matchTitle(f: Pick<Fixture, "team_a" | "team_b">) {
  return `${teamOf(f.team_a).name} vs ${teamOf(f.team_b).name}`;
}

/** "14 Nov 2026, 4:00 pm" in Indian time, the same on the server and in every browser. */
export function formatKickoff(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date);
}
