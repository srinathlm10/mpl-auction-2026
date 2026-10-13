import { getSportConfig } from "./sports";
import { PLAYER_STATUSES, type PlayerStatus, type Sport } from "./types";

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function wholeNumber(raw: string, label: string, { min = 0 } = {}): Parsed<number> {
  if (raw === "") return { ok: false, error: `${label} is required.` };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) return { ok: false, error: `${label} must be a whole number${min > 0 ? ` of at least ${min}` : " (0 or more)"}.` };
  return { ok: true, value: n };
}

/** Reads `skill_<key>` entries for the sport; blanks are skipped, values must be 1–10. */
export function parseSkills(
  sport: Sport,
  read: (key: string) => string | undefined,
): Parsed<Record<string, number>> {
  const skills: Record<string, number> = {};
  for (const def of getSportConfig(sport.slug, sport.name).skills) {
    const raw = (read(def.key) ?? "").trim();
    if (raw === "") continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      return { ok: false, error: `${def.label} rating must be between 1 and 10.` };
    }
    skills[def.key] = Math.round(n * 10) / 10;
  }
  return { ok: true, value: skills };
}

export interface PlayerFormValue {
  name: string;
  sport_id: number;
  batch: string;
  role_or_position: string;
  skills: Record<string, number>;
  base_price: number;
  status: PlayerStatus;
  team_id: number | null;
  sold_price: number | null;
}

export function parsePlayerForm(fd: FormData, sports: Sport[]): Parsed<PlayerFormValue> {
  const name = text(fd, "name");
  if (!name) return { ok: false, error: "Name is required." };

  const sport = sports.find((s) => String(s.id) === text(fd, "sport_id"));
  if (!sport) return { ok: false, error: "Please choose a sport." };

  const basePrice = wholeNumber(text(fd, "base_price"), "Base price");
  if (!basePrice.ok) return basePrice;

  const skills = parseSkills(sport, (key) => text(fd, `skill_${key}`));
  if (!skills.ok) return skills;

  const status = text(fd, "status") as PlayerStatus;
  if (!PLAYER_STATUSES.includes(status)) return { ok: false, error: "Invalid status." };

  let teamId: number | null = null;
  let soldPrice: number | null = null;
  if (status === "sold") {
    teamId = Number(text(fd, "team_id"));
    if (!Number.isInteger(teamId) || teamId <= 0) return { ok: false, error: "Choose the team that bought this player." };
    const sold = wholeNumber(text(fd, "sold_price"), "Sold price");
    if (!sold.ok) return sold;
    soldPrice = sold.value;
  }

  return {
    ok: true,
    value: {
      name,
      sport_id: sport.id,
      batch: text(fd, "batch"),
      role_or_position: text(fd, "role_or_position"),
      skills: skills.value,
      base_price: basePrice.value,
      status,
      team_id: teamId,
      sold_price: soldPrice,
    },
  };
}

export interface TeamFormValue {
  name: string;
  sport_id: number;
  captain: string;
  total_purse: number;
}

export function parseTeamForm(fd: FormData, sports: Sport[]): Parsed<TeamFormValue> {
  const name = text(fd, "name");
  if (!name) return { ok: false, error: "Team name is required." };

  const sport = sports.find((s) => String(s.id) === text(fd, "sport_id"));
  if (!sport) return { ok: false, error: "Please choose a sport." };

  const purse = wholeNumber(text(fd, "total_purse"), "Total purse");
  if (!purse.ok) return purse;

  return { ok: true, value: { name, sport_id: sport.id, captain: text(fd, "captain"), total_purse: purse.value } };
}
