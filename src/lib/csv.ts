import { parseSkills } from "./validation";
import type { PlayerInput, Sport } from "./types";

/**
 * CSV columns (header names are case-insensitive):
 *   name, sport, batch, role_or_position, base_price, photo_url (optional),
 *   skill_<key> (optional, 1-10) e.g. skill_batting, skill_pace
 * `sport` may be the sport's name or slug. `role` / `position` are accepted
 * as aliases for role_or_position and `price` for base_price.
 */
export type CsvRow = Record<string, string | undefined>;

export interface RowError {
  /** 1-based row number as seen in the spreadsheet (header = row 1). */
  row: number;
  message: string;
}

export interface ParsedImport {
  valid: PlayerInput[];
  errors: RowError[];
}

const ALIASES: Record<string, string> = {
  role: "role_or_position",
  position: "role_or_position",
  "role/position": "role_or_position",
  price: "base_price",
  "base price": "base_price",
};

function normalise(row: CsvRow): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const lower = rawKey.trim().toLowerCase();
    const key = ALIASES[lower] ?? lower.replace(/\s+/g, "_");
    out[key] = String(value ?? "").trim();
  }
  return out;
}

export function parsePlayerRows(rows: CsvRow[], sports: Sport[]): ParsedImport {
  const valid: PlayerInput[] = [];
  const errors: RowError[] = [];

  rows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const row = normalise(raw);
    const fail = (message: string) => errors.push({ row: rowNumber, message });

    if (!row.name) return fail("name is missing");

    const sportKey = (row.sport ?? "").toLowerCase();
    const sport = sports.find((s) => s.slug === sportKey || s.name.toLowerCase() === sportKey);
    if (!sport) return fail(`unknown sport "${row.sport ?? ""}"`);

    const price = Number((row.base_price ?? "").replace(/,/g, ""));
    if (!Number.isInteger(price) || price < 0) return fail("base_price must be a whole number");

    const skills = parseSkills(sport, (key) => row[`skill_${key}`]);
    if (!skills.ok) return fail(skills.error);

    valid.push({
      name: row.name,
      sport_id: sport.id,
      batch: row.batch ?? "",
      role_or_position: row.role_or_position ?? "",
      skills: skills.value,
      photo_url: row.photo_url || null,
      base_price: price,
    });
  });

  return { valid, errors };
}
