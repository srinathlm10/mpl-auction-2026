"use client";

import { useMemo, useSyncExternalStore } from "react";
import { buildMatches } from "./live";
import { liveConfigured } from "./live-config";
import { fixtures } from "./live-data";
import { getServerSnapshot, getSnapshot, subscribePolling, subscribeRealtime } from "./live-store";

/**
 * Every planned match with its live score. Before the scores arrive (or when live scoring is not
 * set up) the matches show as upcoming, so the pages always have something to show.
 *
 * `realtime: false` is for pages that only glance at the scores: they check every 20 seconds
 * instead of keeping a live connection open.
 */
export function useLive({ realtime = true }: { realtime?: boolean } = {}) {
  const snap = useSyncExternalStore(realtime ? subscribeRealtime : subscribePolling, getSnapshot, getServerSnapshot);
  const matches = useMemo(() => buildMatches(fixtures, snap.rows), [snap.rows]);
  return { matches, squads: snap.squads, status: snap.status, loaded: snap.loaded, error: snap.error, configured: liveConfigured };
}
