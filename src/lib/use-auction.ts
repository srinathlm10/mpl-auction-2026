"use client";

import { useMemo, useSyncExternalStore } from "react";
import { applyResults, getServerStore, getStore, snapshotOf, subscribe } from "./local-auction";
import { isMuted, subscribeMuted } from "./sound";

export function useMuted() {
  return useSyncExternalStore(subscribeMuted, isMuted, () => false);
}

/** The saved auction in this browser. Re-renders on every change, in this window or another. */
function useStore() {
  return useSyncExternalStore(subscribe, getStore, getServerStore);
}

/**
 * Everything the auction screens need (live state, settings, players, teams, current bids).
 * Null until the saved auction has been read, so a refresh never replays sounds or overlays.
 */
export function useAuctionSnapshot() {
  const store = useStore();
  return useMemo(() => (store === getServerStore() ? null : snapshotOf(store)), [store]);
}

/** Sports, players and teams with the auction results so far, for the public pages. */
export function useAuctionData() {
  const store = useStore();
  return useMemo(() => ({ ...applyResults(store), settings: store.settings }), [store]);
}
