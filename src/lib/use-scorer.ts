"use client";

import { useCallback, useEffect, useState } from "react";
import { liveConfigured } from "./live-config";
import { getClient } from "./live-store";

/*
 * Who may change a score? Not an account: there is no sign-up and no login. The scorers get a
 * private link, https://<site>/admin/score#key=<secret>. Opening it saves the secret in that
 * browser (and removes it from the address bar); from then on the page just works there.
 * The database checks the secret on every save (see supabase/live-scores.sql), so a visitor
 * without it can look at the scoring page but cannot change anything.
 */

const STORAGE_KEY = "mpl-scorer-key";
const KEY_IN_LINK = /[#&]key=([A-Za-z0-9_-]{16,128})/;

let memoryKey: string | null = null; // used when the browser will not let us store anything

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? memoryKey;
  } catch {
    return memoryKey;
  }
}

function store(key: string | null) {
  memoryKey = key;
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode etc.: the in-memory copy still works until the tab is closed */
  }
}

export type ScorerState =
  | { phase: "loading" }
  /** Nobody has opened the private scoring link in this browser. */
  | { phase: "no-key" }
  /** The saved link is wrong or has been switched off. */
  | { phase: "invalid" }
  /** The database could not be reached to check the key. */
  | { phase: "error"; message: string }
  | { phase: "ready"; key: string };

export function useScorer() {
  const [state, setState] = useState<ScorerState>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);

  // A new link pasted into this same tab only changes the part after "#", so the page is not reloaded.
  useEffect(() => {
    const onHash = () => setAttempt((n) => n + 1);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!liveConfigured) return;
    let active = true;

    const fromLink = KEY_IN_LINK.exec(window.location.hash)?.[1];
    if (fromLink) {
      store(fromLink);
      // Do not leave the secret sitting in the address bar.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    const key = fromLink ?? readStored();
    if (!key) {
      setState({ phase: "no-key" });
      return;
    }

    setState({ phase: "loading" });
    (async () => {
      try {
        const client = await getClient();
        const { data, error } = await client.rpc("live_check_key", { p_key: key });
        if (!active) return;
        if (error) return setState({ phase: "error", message: error.message });
        if (data === true) return setState({ phase: "ready", key });
        store(null);
        setState({ phase: "invalid" });
      } catch (e) {
        if (active) setState({ phase: "error", message: e instanceof Error ? e.message : "Could not reach the scores." });
      }
    })();

    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  /** Stops scoring on this device (the link still works if it is opened again). */
  const forget = useCallback(() => {
    store(null);
    setState({ phase: "no-key" });
  }, []);

  return { state, retry, forget };
}
