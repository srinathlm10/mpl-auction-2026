"use client";

import { useMemo, useState } from "react";
import { FilterBar, type FilterOption } from "@/components/FilterBar";
import { PlayerCard } from "@/components/PlayerCard";
import { statusLabel } from "@/components/ui/StatusBadge";
import { PLAYER_STATUSES, type Player } from "@/lib/types";

interface Props {
  players: Player[];
  /** team id -> team name, for sold players. */
  teamNames: Record<number, string>;
  roleLabel: string;
}

const ALL = "";

const SORT_OPTIONS: FilterOption[] = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "price-desc", label: "Base price (high → low)" },
  { value: "price-asc", label: "Base price (low → high)" },
  { value: "batch", label: "Batch" },
  { value: "status", label: "Status" },
];

const STATUS_ORDER: Record<string, number> = { available: 0, sold: 1, unsold: 2 };

function sortPlayers(players: Player[], sort: string): Player[] {
  const list = [...players];
  switch (sort) {
    case "price-desc":
      return list.sort((a, b) => b.base_price - a.base_price || a.name.localeCompare(b.name));
    case "price-asc":
      return list.sort((a, b) => a.base_price - b.base_price || a.name.localeCompare(b.name));
    case "batch":
      return list.sort((a, b) => a.batch.localeCompare(b.batch) || a.name.localeCompare(b.name));
    case "status":
      return list.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name));
    default:
      return list.sort((a, b) => a.name.localeCompare(b.name));
  }
}

/** Player grid with search, role / status / batch filters and sorting. */
export function PlayerExplorer({ players, teamNames, roleLabel }: Props) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [batch, setBatch] = useState(ALL);
  const [sort, setSort] = useState("name-asc");

  const roles = useMemo(() => unique(players.map((p) => p.role_or_position)), [players]);
  const batches = useMemo(() => unique(players.map((p) => p.batch)), [players]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = players.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q)) &&
        (role === ALL || p.role_or_position === role) &&
        (status === ALL || p.status === status) &&
        (batch === ALL || p.batch === batch),
    );
    return sortPlayers(filtered, sort);
  }, [players, search, role, status, batch, sort]);

  const canReset = Boolean(search || role || status || batch);
  const reset = () => {
    setSearch("");
    setRole(ALL);
    setStatus(ALL);
    setBatch(ALL);
  };

  return (
    <>
      <FilterBar
        search={search}
        onSearch={setSearch}
        fields={[
          { id: "role", label: roleLabel, value: role, onChange: setRole, options: withAll(`All ${roleLabel.toLowerCase()}s`, roles) },
          {
            id: "status",
            label: "Status",
            value: status,
            onChange: setStatus,
            options: [{ value: ALL, label: "Any status" }, ...PLAYER_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))],
          },
          { id: "batch", label: "Batch", value: batch, onChange: setBatch, options: withAll("All batches", batches) },
        ]}
        sort={sort}
        sortOptions={SORT_OPTIONS}
        onSort={setSort}
        resultCount={visible.length}
        onReset={reset}
        canReset={canReset}
      />

      {visible.length === 0 ? (
        <div className="card p-10 text-center text-muted">No players match these filters.</div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {visible.map((player) => (
            <li key={player.id}>
              <PlayerCard player={player} teamName={player.team_id ? teamNames[player.team_id] : undefined} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function withAll(allLabel: string, values: string[]): FilterOption[] {
  return [{ value: ALL, label: allLabel }, ...values.map((v) => ({ value: v, label: v }))];
}
