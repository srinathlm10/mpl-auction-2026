"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { snapshotOfMatch, soundCue, type Match, type MatchSnapshot } from "./live";
import { isAudioReady, isLiveSoundOn, liveSounds, subscribeLiveSound, unlockAudio } from "./sound";

/** Whether the live-score sounds are switched on in this browser (on until someone switches them off). */
export function useLiveSoundOn() {
  return useSyncExternalStore(subscribeLiveSound, isLiveSoundOn, () => true);
}

/** Whether the browser is letting this page play sound yet. */
export function useAudioReady() {
  return useSyncExternalStore(subscribeLiveSound, isAudioReady, () => false);
}

/* On a phone only the end of a tap counts as a gesture, so a pointerdown alone would not unlock sound. */
const GESTURES = ["pointerup", "touchend", "click", "keydown"];

/**
 * Plays the sound that fits each change in the matches: whistles, a goal horn, cards, volleyball points.
 * It stays silent on the first look (opening the page in the middle of a match must not replay anything),
 * and only reacts to changes that arrive after that.
 */
export function useLiveSounds(matches: Match[], loaded: boolean) {
  const on = useLiveSoundOn();
  const ready = useAudioReady();
  const before = useRef<Map<string, MatchSnapshot> | null>(null);

  // Keeps trying on every tap until the browser allows sound. The sound button handles its own taps.
  useEffect(() => {
    if (!on || ready) return;
    const unlock = (e: Event) => {
      if (!(e.target instanceof Element && e.target.closest("[data-sound-toggle]"))) void unlockAudio();
    };
    void unlockAudio();
    GESTURES.forEach((name) => window.addEventListener(name, unlock));
    return () => GESTURES.forEach((name) => window.removeEventListener(name, unlock));
  }, [on, ready]);

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
