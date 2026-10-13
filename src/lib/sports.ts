import type { CSSProperties } from "react";

/**
 * Front-end configuration for each sport: look & feel, the roles/positions a
 * player can have, and which skill ratings are captured.
 *
 * To add a new sport: insert a row in the `sports` table (name + slug) and add
 * an entry here with the same slug. A sport without an entry still works – it
 * just falls back to FALLBACK_SPORT (generic colours, free-text role, no skills).
 */
export interface SkillDef {
  key: string;
  label: string;
}

/** A text detail shown on player cards and usable as a filter, e.g. bowling action. */
export interface AttributeDef {
  key: string;
  label: string;
}

/**
 * A separate auction wheel within a sport, chosen by player role. A player
 * whose role is in no pool goes on the FIRST wheel, so nobody is left out.
 */
export interface WheelPool {
  key: string;
  label: string;
  /** One line under the label on the wheel chooser. */
  description: string;
  /** Shown in the middle of the wheel and on the chooser. */
  emoji: string;
  roles: string[];
  /** Slice colours, so each wheel looks clearly different on the projector. */
  palette: string[];
}

export interface SportConfig {
  slug: string;
  name: string;
  emoji: string;
  tagline: string;
  /** "R G B" channels, used for the --accent CSS variable on sport pages. */
  accent: string;
  roleLabel: string;
  roles: string[];
  skills: SkillDef[];
  attributes: AttributeDef[];
  /** Optional separate wheels; leave empty for one wheel with every player. */
  pools: WheelPool[];
  defaultBasePrice: number;
}

export const SPORT_CONFIGS: SportConfig[] = [
  {
    slug: "cricket",
    name: "Cricket",
    emoji: "🏏",
    tagline: "Bat, bowl and boundary hunters",
    accent: "16 185 129",
    roleLabel: "Role",
    roles: ["Batsman", "Bowler", "All-rounder", "Wicketkeeper", "Fielder"],
    skills: [
      { key: "batting", label: "Batting" },
      { key: "bowling", label: "Bowling" },
      { key: "fielding", label: "Fielding" },
      { key: "fitness", label: "Fitness" },
    ],
    attributes: [
      { key: "bowling_action", label: "Bowling action" },
      { key: "batting_hand", label: "Batting" },
    ],
    pools: [
      {
        key: "batsmen",
        label: "Batsmen",
        description: "Batsmen, wicketkeepers and fielders",
        emoji: "🏏",
        roles: ["Batsman", "Wicketkeeper", "Fielder"],
        palette: ["#dc2626", "#f59e0b", "#ea580c", "#e11d48", "#d97706", "#f97316", "#be123c", "#ca8a04"],
      },
      {
        key: "bowlers",
        label: "Bowlers",
        description: "Bowlers and all-rounders",
        emoji: "🎯",
        roles: ["Bowler", "All-rounder"],
        palette: ["#2563eb", "#0891b2", "#7c3aed", "#0d9488", "#4f46e5", "#0284c7", "#9333ea", "#059669"],
      },
    ],
    defaultBasePrice: 50000,
  },
  {
    slug: "volleyball",
    name: "Volleyball",
    emoji: "🏐",
    tagline: "Spikes, blocks and big rallies",
    accent: "249 115 22",
    roleLabel: "Position",
    roles: ["Setter", "Outside Hitter", "Middle Blocker", "Opposite Hitter", "Libero"],
    skills: [
      { key: "attack", label: "Attack" },
      { key: "block", label: "Block" },
      { key: "serve", label: "Serve" },
      { key: "defense", label: "Defense" },
    ],
    attributes: [],
    pools: [],
    defaultBasePrice: 40000,
  },
  {
    slug: "football",
    name: "Football",
    emoji: "⚽",
    tagline: "Pace, passing and clinical finishing",
    accent: "14 165 233",
    roleLabel: "Position",
    roles: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
    skills: [
      { key: "pace", label: "Pace" },
      { key: "shooting", label: "Shooting" },
      { key: "passing", label: "Passing" },
      { key: "defending", label: "Defending" },
    ],
    attributes: [],
    pools: [],
    defaultBasePrice: 40000,
  },
];

export const FALLBACK_SPORT: SportConfig = {
  slug: "",
  name: "Sport",
  emoji: "🏆",
  tagline: "",
  accent: "245 158 11",
  roleLabel: "Role",
  roles: [],
  skills: [],
  attributes: [],
  pools: [],
  defaultBasePrice: 50000,
};

export function getSportConfig(slug: string, name?: string): SportConfig {
  const found = SPORT_CONFIGS.find((s) => s.slug === slug);
  if (found) return found;
  return { ...FALLBACK_SPORT, slug, name: name ?? slug };
}

/** Key of the wheel a player belongs to (undefined when the sport has a single wheel). */
export function poolOf(player: { role_or_position: string }, config: Pick<SportConfig, "pools">): string | undefined {
  if (config.pools.length === 0) return undefined;
  return (config.pools.find((p) => p.roles.includes(player.role_or_position)) ?? config.pools[0]).key;
}

/** "All-rounder · Round arm · 2025-27" – role, text attributes and batch. */
export function playerSubtitle(
  player: { role_or_position: string; batch: string; attributes?: Record<string, string> },
  { batchPrefix = "" } = {},
): string {
  const extras = Object.values(player.attributes ?? {}).filter(Boolean);
  return [player.role_or_position, ...extras, player.batch && `${batchPrefix}${player.batch}`].filter(Boolean).join(" · ");
}

/** Inline style that re-points the accent colour for everything inside. */
export function accentStyle(config: Pick<SportConfig, "accent">): CSSProperties {
  return { "--accent": config.accent } as CSSProperties;
}
