"use client";

import { useMemo, useSyncExternalStore } from "react";
import recordedResults from "@/data/recorded-results.json";
import { buildMatches, normalizeRow, type LiveRow } from "./live";
import { liveConfigured } from "./live-config";
import { fixtures, squads } from "./live-data";
import { getServerSnapshot, getSnapshot, subscribeRealtime } from "./live-store";

/** Results added after the match instead of being scored live. A row saved in the database always replaces these. */
const recorded: Record<string, LiveRow> = Object.fromEntries(
  recordedResults.flatMap((raw) => {
    const row = normalizeRow(raw);
    return row ? [[row.id, row]] : [];
  }),
);

/**
 * Every planned match with its live score. Before the scores arrive (or when live scoring is not
 * set up) the matches show as upcoming, so the pages always have something to show.
 */
export function useLive() {
  const snap = useSyncExternalStore(subscribeRealtime, getSnapshot, getServerSnapshot);
  const matches = useMemo(() => buildMatches(fixtures, { ...recorded, ...snap.rows }), [snap.rows]);
  return { matches, squads, status: snap.status, loaded: snap.loaded, error: snap.error, configured: liveConfigured };
}
