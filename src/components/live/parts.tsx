"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { cn } from "@/lib/format";
import { formatMinute, isLive, leader, statusLabel, type Match, type Side } from "@/lib/live";
import { formatKickoff, sportInfo, teamOf } from "@/lib/live-data";
import { serverNow, type ConnectionStatus } from "@/lib/live-store";
import { liveSounds, setLiveSoundOn, unlockAudio } from "@/lib/sound";
import { accentStyle } from "@/lib/sports";
import { useAudioReady, useLiveSoundOn } from "@/lib/use-live-sound";
import { useNow } from "@/lib/use-now";

const LOGO_SIZES = {
  sm: { box: "h-8 w-8 rounded-lg", px: "32px", text: "text-xs" },
  md: { box: "h-12 w-12 rounded-xl", px: "48px", text: "text-base" },
  lg: { box: "h-16 w-16 rounded-2xl sm:h-24 sm:w-24", px: "96px", text: "text-xl" },
};

export function TeamLogo({ teamId, size = "md" }: { teamId: number; size?: keyof typeof LOGO_SIZES }) {
  const team = teamOf(teamId);
  const s = LOGO_SIZES[size];
  return (
    <span className={cn("relative block shrink-0 overflow-hidden bg-white shadow-card ring-1 ring-border", s.box)}>
      <PlayerAvatar fit="contain" name={teamId > 0 ? team.name : "?"} src={team.logo_url} sizes={s.px} className={s.text} />
    </span>
  );
}

/** A number that pops (and flashes gold) when it changes. It stays still the first time it appears. */
export function Digit({ value, className }: { value: number | string; className?: string }) {
  const previous = useRef(value);
  const [pops, setPops] = useState(0);
  useEffect(() => {
    if (previous.current !== value) {
      previous.current = value;
      setPops((n) => n + 1);
    }
  }, [value]);
  return (
    <span key={pops} className={cn(pops > 0 && "animate-score-pop", className)}>
      {value}
    </span>
  );
}

/** The minute of a live football match, with a blinking mark like on a TV score bug. */
export function ClockText({ text, running, className }: { text: string; running: boolean; className?: string }) {
  if (!running || !text.endsWith("'")) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {text.slice(0, -1)}
      <span className="animate-clock-blink">&apos;</span>
    </span>
  );
}

/** LIVE with the minute (pulsing), HALF TIME, FULL TIME / FINAL, or UPCOMING. "onColor" is for the coloured match header. */
export function StatusPill({ match, className, onColor = false, now }: { match: Match; className?: string; onColor?: boolean; now?: Date }) {
  const label = statusLabel(match, now ?? serverNow());
  const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide";
  if (match.status === "live") {
    return (
      <span className={cn(base, "bg-red-600 text-white", onColor && "ring-2 ring-white/70", className)}>
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        Live · {label}
      </span>
    );
  }
  const tone = onColor
    ? match.status === "break"
      ? "bg-white text-amber-700"
      : "bg-white/90 text-slate-800"
    : match.status === "break"
      ? "bg-amber-500/20 text-amber-700 ring-1 ring-inset ring-amber-500/40 dark:text-amber-300"
      : match.status === "finished"
        ? "bg-slate-500/15 text-slate-600 ring-1 ring-inset ring-slate-500/30 dark:text-slate-300"
        : "bg-primary/10 text-primary ring-1 ring-inset ring-primary/25";
  return <span className={cn(base, tone, className)}>{label}</span>;
}

/** "25–20 · 18–25 · 9–7" for volleyball, the goals so far for football. */
export function summaryLine(match: Match): string | null {
  if (match.volleyball) {
    return (
      match.volleyball.sets
        .filter((s) => s.done || s.a + s.b > 0 || match.status !== "finished")
        .map((s) => `${s.a}–${s.b}`)
        .join(" · ") || "Match started"
    );
  }
  const goals = match.events.filter((e) => e.kind === "goal" || e.kind === "own_goal");
  if (goals.length === 0) return match.status === "finished" ? "No goals" : "No goals yet";
  return goals
    .slice(-3)
    .map((e) => `${e.player || (e.kind === "own_goal" ? "Own goal" : "Goal")} ${formatMinute(e.minute, e.added)}`.trim())
    .join(" · ");
}

function TeamRow({ match, side }: { match: Match; side: Side }) {
  const team = teamOf(side === "a" ? match.team_a : match.team_b);
  const ahead = leader(match) === side;
  const dim = match.status === "finished" && leader(match) !== null && !ahead;
  return (
    <div className="flex items-center gap-2.5">
      <TeamLogo teamId={team.id} size="sm" />
      <span className={cn("min-w-0 flex-1 truncate font-display text-xl font-bold uppercase leading-tight", dim && "text-muted")}>{team.name}</span>
      {match.status !== "upcoming" && (
        <span className={cn("font-display text-3xl font-extrabold leading-none tabular-nums", ahead ? "text-foreground" : "text-muted")}>
          <Digit value={match.score[side]} />
        </span>
      )}
    </div>
  );
}

/** One match as a card that links to its page. */
export function MatchCard({ match }: { match: Match }) {
  const { name, emoji, config } = sportInfo(match.sport);
  const now = useNow(5000);
  const upcoming = match.status === "upcoming";
  const summary = upcoming ? null : summaryLine(match);
  return (
    <Link
      href={`/live/${match.id}`}
      style={accentStyle(config)}
      className={cn("card-link block p-3.5 sm:p-4", isLive(match) && "ring-2 ring-red-500/40")}
    >
      <div className="flex min-h-[20px] items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-accent-strong">
          <span aria-hidden>{emoji}</span> {name} · {match.round}
        </span>
        {upcoming ? (
          <span className="shrink-0 text-xs font-medium text-muted">{formatKickoff(match.starts_at) ?? "Time TBA"}</span>
        ) : (
          <StatusPill match={match} now={now} />
        )}
      </div>
      <div className="mt-3 space-y-2">
        <TeamRow match={match} side="a" />
        <TeamRow match={match} side="b" />
      </div>
      {summary && <p className="mt-3 truncate border-t border-border pt-2.5 text-xs font-medium text-muted">{summary}</p>}
    </Link>
  );
}

/** A quiet line saying whether the scores are arriving live. */
export function ConnectionNote({ status, error, loaded }: { status: ConnectionStatus; error: string | null; loaded: boolean }) {
  if (error && loaded) {
    return <p className="text-sm text-muted">Can&apos;t reach the live scores right now. The last score we have is shown; it will refresh by itself.</p>;
  }
  const live = status === "live";
  return (
    <p className="flex items-center gap-2 text-sm text-muted">
      <span aria-hidden className={cn("h-2 w-2 rounded-full", live ? "bg-emerald-500" : status === "connecting" ? "bg-amber-400" : "bg-slate-400")} />
      {live ? "Live: scores appear the moment they change." : status === "connecting" ? "Connecting…" : "Scores refresh every few seconds."}
    </p>
  );
}

/**
 * Switches the whistles, goal horn and other live-score sounds on or off (on to begin with). Browsers
 * hold sound back until the first tap, so until then it says so: a button reading "Sound on" over
 * silence would be misleading, and tapping it then must start the sound, not switch it off.
 */
export function SoundToggle({ className }: { className?: string }) {
  const on = useLiveSoundOn();
  const ready = useAudioReady();
  const playing = on && ready;
  return (
    <button
      type="button"
      data-sound-toggle
      aria-pressed={on}
      onClick={() => {
        if (playing) return setLiveSoundOn(false);
        setLiveSoundOn(true);
        void unlockAudio().then(() => liveSounds.preview());
      }}
      className={cn(
        "inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
        playing ? "border-transparent bg-primary text-primary-foreground shadow-sm" : "border-border bg-surface text-foreground hover:border-primary/60 hover:text-primary",
        on && !ready && "border-primary/60 text-primary",
        className,
      )}
    >
      <Icon name={on ? "volume" : "mute"} className="h-4 w-4" />
      {playing ? "Sound on" : on ? "Tap for sound" : "Sound off"}
    </button>
  );
}
