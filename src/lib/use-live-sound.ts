"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { snapshotOfMatch, soundCue, type Match, type MatchSnapshot } from "./live";
import { isLiveSoundOn, liveSounds, subscribeLiveSound, unlockAudio } from "./sound";

/** Whether the live-score sounds are switched on in this browser (off until someone taps the sound button). */
export function useLiveSoundOn() {
  return useSyncExternalStore(subscribeLiveSound, isLiveSoundOn, () => false);
}

/**
 * Plays the sound that fits each change in the matches: whistles, a goal horn, cards, volleyball points.
 * It stays silent on the first look (opening the page in the middle of a match must not replay anything),
 * and only reacts to changes that arrive after that.
 */
export function useLiveSounds(matches: Match[], loaded: boolean) {
  const on = useLiveSoundOn();
  const before = useRef<Map<string, MatchSnapshot> | null>(null);

  // Browsers only allow sound after a tap; the first tap anywhere on the page unlocks it.
  useEffect(() => {
    if (!on) return;
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [on]);

  useEffect(() => {
    if (!loaded) return;
    const next = new Map(matches.map((m) => [m.id, snapshotOfMatch(m)] as const));
    const previous = before.current;
    before.current = next;
    if (!previous || !isLiveSoundOn()) return;
    for (const match of matches) {
      const a = previous.get(match.id);
      const b = next.get(match.id);
      if (!a || !b) continue;
      const cue = soundCue(match.sport, a, b);
      if (cue) liveSounds[cue]();
    }
  }, [matches, loaded]);
}
