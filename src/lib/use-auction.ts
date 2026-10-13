"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isMuted, subscribeMuted } from "./sound";
import { getBrowserClient } from "./supabase/browser";
import type { AuctionSettings, AuctionSnapshot, AuctionState, Bid, Player, Sport, Team } from "./types";

const isOlder = (a: AuctionState, b: AuctionState) => Date.parse(a.updated_at) < Date.parse(b.updated_at);

export function useMuted() {
  return useSyncExternalStore(subscribeMuted, isMuted, () => false);
}

/**
 * Loads the full auction snapshot and keeps it live.
 *  - Supabase Realtime tells us when anything changes -> we reload the snapshot.
 *  - A slow poll is a safety net if the realtime connection drops.
 * Because the snapshot always comes from the database, a refresh in the middle
 * of an auction restores the exact state.
 */
export function useAuctionSnapshot() {
  const [snap, setSnap] = useState<AuctionSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const loading = useRef(false);
  const again = useRef(false);
  // Newest live state shown so far. A slow refresh that started before an action
  // must never put an older state back on screen (it would make the next bid stale).
  const latest = useRef<AuctionState | null>(null);

  const refresh = useCallback(async () => {
    if (loading.current) {
      again.current = true;
      return;
    }
    loading.current = true;
    try {
      do {
        again.current = false;
        const sb = getBrowserClient();
        const stateRes = await sb.from("auction_state").select("*").eq("id", 1).single();
        if (stateRes.error) throw new Error(stateRes.error.message);
        const state = stateRes.data as AuctionState;
        if (latest.current && isOlder(state, latest.current)) continue; // stale – a newer refresh follows

        const [settings, sports, teams, players, bids] = await Promise.all([
          sb.from("auction_settings").select("*").eq("id", 1).single(),
          sb.from("sports").select("*").order("id"),
          sb.from("teams").select("*").order("id"),
          sb.from("players").select("*").order("id"),
          sb
            .from("bids")
            .select("*")
            .eq("player_id", state.current_player_id ?? -1)
            .is("voided_at", null)
            .order("id", { ascending: false }),
        ]);
        const failed = [settings, sports, teams, players, bids].find((r) => r.error);
        if (failed?.error) throw new Error(failed.error.message);
        // Check again: an action may have finished while the rest was loading.
        if (latest.current && isOlder(state, latest.current)) continue;

        latest.current = state;
        setSnap({
          state,
          settings: settings.data as AuctionSettings,
          sports: sports.data as Sport[],
          teams: teams.data as Team[],
          players: players.data as Player[],
          bids: bids.data as Bid[],
        });
        setError(null);
      } while (again.current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the auction.");
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    const sb = getBrowserClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 60);
    };

    void refresh();
    let channel = sb.channel("mpl-auction-live");
    for (const table of ["auction_state", "bids", "players", "teams"]) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, schedule);
    }
    channel.subscribe((status) => setConnected(status === "SUBSCRIBED"));
    const poll = setInterval(() => void refresh(), 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [refresh]);

  /** Show a state returned by an RPC immediately, before realtime catches up. */
  const applyState = useCallback((state: AuctionState) => {
    if (latest.current && isOlder(state, latest.current)) return;
    latest.current = state;
    setSnap((current) => (current ? { ...current, state } : current));
  }, []);

  return { snap, error, connected, refresh, applyState };
}
