"use client";

import { useCallback, useEffect, useState } from "react";
import { liveConfigured } from "./live-config";
import { getClient, type ScorerLogin } from "./live-store";

/*
 * Who may change a score? One scorer login: an ID and a password. There is no sign-up and nobody
 * else can create an account. Viewers never need to sign in.
 *
 * The login is checked by the database on every change (see supabase/live-scores.sql), so a visitor
 * who opens the scoring page can look but cannot change anything. After signing in, this device
 * remembers the login (in its own storage) until "Sign out" is pressed.
 */

const STORAGE_KEY = "mpl-scorer-login";

let memoryLogin: ScorerLogin | null = null; // used when the browser will not let us store anything

function readStored(): ScorerLogin | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ScorerLogin>;
      if (typeof parsed.user === "string" && typeof parsed.password === "string") return { user: parsed.user, password: parsed.password };
    }
  } catch {
    /* fall through to the in-memory copy */
  }
  return memoryLogin;
}

function store(login: ScorerLogin | null) {
  memoryLogin = login;
  try {
    if (login) localStorage.setItem(STORAGE_KEY, JSON.stringify(login));
    else localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("mpl-scorer-key"); // from the first version, which used a secret link
  } catch {
    /* private mode etc.: the in-memory copy still works until the tab is closed */
  }
}

export type ScorerState =
  | { phase: "loading" }
  /** Show the sign-in form. `notice` explains why when a remembered login stopped working. */
  | { phase: "signed-out"; notice?: string }
  /** The database could not be reached to check the login. */
  | { phase: "error"; message: string }
  | { phase: "ready"; login: ScorerLogin };

/** Asks the database whether this ID and password are right. Returns true / false, or an error message. */
async function checkLogin(login: ScorerLogin): Promise<boolean | string> {
  try {
    const client = await getClient();
    const { data, error } = await client.rpc("live_check_login", { p_user: login.user, p_password: login.password });
    if (error) return error.message;
    return data === true;
  } catch (e) {
    return e instanceof Error ? e.message : "Could not reach the scores.";
  }
}

export function useScorer() {
  const [state, setState] = useState<ScorerState>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!liveConfigured) return;
    let active = true;
    const saved = readStored();
    if (!saved) {
      setState({ phase: "signed-out" });
      return;
    }
    setState({ phase: "loading" });
    checkLogin(saved).then((result) => {
      if (!active) return;
      if (result === true) setState({ phase: "ready", login: saved });
      else if (result === false) {
        store(null);
        setState({ phase: "signed-out", notice: "The saved sign-in no longer works (the ID or password was changed). Please sign in again." });
      } else setState({ phase: "error", message: result });
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  /** Returns an error message to show, or null when signed in. */
  const signIn = useCallback(async (user: string, password: string): Promise<string | null> => {
    const login = { user: user.trim(), password };
    if (!login.user || !login.password) return "Enter the ID and the password.";
    const result = await checkLogin(login);
    if (result === true) {
      store(login);
      setState({ phase: "ready", login });
      return null;
    }
    return result === false ? "Wrong ID or password." : `Could not check the sign-in: ${result}`;
  }, []);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  /** Forgets the login on this device. */
  const signOut = useCallback(() => {
    store(null);
    setState({ phase: "signed-out" });
  }, []);

  return { state, signIn, signOut, retry };
}
