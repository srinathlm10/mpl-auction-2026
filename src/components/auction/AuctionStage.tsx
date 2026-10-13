"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BiddingPanel } from "@/components/auction/BiddingPanel";
import { Confetti } from "@/components/auction/Confetti";
import { PlayerReveal } from "@/components/auction/PlayerReveal";
import { PoolChooser } from "@/components/auction/PoolChooser";
import { SoldOverlay } from "@/components/auction/SoldOverlay";
import { SpinWheel } from "@/components/auction/SpinWheel";
import { SportSelector } from "@/components/auction/SportSelector";
import { TeamCorner } from "@/components/auction/TeamCorner";
import { SquadDialog, TeamStrip } from "@/components/auction/TeamStrip";
import { Kbd } from "@/components/ui/Kbd";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { checkTeamBid, nextBidAmount } from "@/lib/auction";
import { secureRandomInt } from "@/lib/random";
import { cn, formatCompact } from "@/lib/format";
import { setMuted, sounds, unlockAudio } from "@/lib/sound";
import { accentStyle, getSportConfig, poolOf } from "@/lib/sports";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { AuctionState, AuctionStatus } from "@/lib/types";
import { useAuctionSnapshot, useMuted } from "@/lib/use-auction";

interface Props {
  /** "admin" = the auctioneer's control screen; "display" = view-only projector screen. */
  mode: "admin" | "display";
}

type Notice = { kind: "error" | "info"; text: string };

const CAN_SPIN_FROM: AuctionStatus[] = ["idle", "sold", "unsold"];

// Grid positions for the four team cards: top-left, top-right, bottom-left, bottom-right.
const CORNERS = [
  "lg:col-start-1 lg:row-start-1 lg:self-start",
  "lg:col-start-3 lg:row-start-1 lg:self-start",
  "lg:col-start-1 lg:row-start-2 lg:self-end",
  "lg:col-start-3 lg:row-start-2 lg:self-end",
];

export function AuctionStage({ mode }: Props) {
  const admin = mode === "admin";
  const { snap, error, connected, refresh, applyState } = useAuctionSnapshot();
  const muted = useMuted();

  const [settledSpin, setSettledSpin] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confetti, setConfetti] = useState({ n: 0, big: false });
  const [soldView, setSoldView] = useState<{ playerId: number; teamId: number; price: number } | null>(null);
  const [pickSport, setPickSport] = useState(false);
  const [squadTeamId, setSquadTeamId] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const spunLive = useRef(false);
  const keyActions = useRef<Record<string, () => void>>({});
  const prev = useRef<{ status: AuctionStatus; bid: number | null } | null>(null);

  /* ------------------------------------------------------------- derived */

  const state = snap?.state;
  const sport = snap?.sports.find((s) => s.id === state?.sport_id);
  const config = sport ? getSportConfig(sport.slug, sport.name) : null;
  const squadSize = sport?.squad_size ?? 11;
  const sportTeams = useMemo(
    () => (snap && sport ? snap.teams.filter((t) => t.sport_id === sport.id).sort((a, b) => a.id - b.id) : []),
    [snap, sport],
  );
  // Sports can have several wheels (cricket: batsmen / bowlers); the admin picks which one is showing.
  const pools = config?.pools ?? [];
  const activePool = pools.find((p) => p.key === state?.pool);
  // Same order on every screen (by id) so the wheel looks identical everywhere.
  const availableInSport = useMemo(
    () =>
      snap && sport
        ? snap.players.filter((p) => p.sport_id === sport.id && p.status === "available").sort((a, b) => a.id - b.id)
        : [],
    [snap, sport],
  );
  const wheelPlayers = useMemo(
    () => (config && activePool ? availableInSport.filter((p) => poolOf(p, config) === activePool.key) : availableInSport),
    [availableInSport, config, activePool],
  );
  const poolCount = (key: string) => (config ? availableInSport.filter((p) => poolOf(p, config) === key).length : 0);
  const unsoldCount = snap && sport ? snap.players.filter((p) => p.sport_id === sport.id && p.status === "unsold").length : 0;
  const currentPlayer = snap?.players.find((p) => p.id === state?.current_player_id);
  const boughtCount = useCallback(
    (teamId: number) => snap?.players.filter((p) => p.team_id === teamId && p.status === "sold").length ?? 0,
    [snap],
  );

  /* ---------------------------------------------- reactions to live changes */

  useEffect(() => {
    if (!snap) return;
    const { state: st } = snap;
    const before = prev.current;
    prev.current = { status: st.status, bid: st.current_bid };
    if (!before) return; // first load (e.g. page refresh): no sounds or overlays

    if (st.status === "sold" && before.status !== "sold" && st.current_player_id && st.highest_team_id && st.current_bid) {
      setSoldView({ playerId: st.current_player_id, teamId: st.highest_team_id, price: st.current_bid });
      setConfetti((c) => ({ n: c.n + 1, big: true }));
      sounds.sold();
    } else if (st.status === "unsold" && before.status !== "unsold") {
      sounds.unsold();
    } else if (st.status === "bidding" && before.status === "bidding" && st.highest_team_id && (st.current_bid ?? 0) > (before.bid ?? 0)) {
      sounds.bid();
    }
  }, [snap]);

  useEffect(() => {
    if (!admin) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      const action = keyActions.current[e.key === " " ? "space" : e.key.toLowerCase()];
      if (action) {
        e.preventDefault();
        action();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [admin]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const onSpinStart = useCallback(() => {
    spunLive.current = true;
    setAnimating(true);
    sounds.spinStart();
  }, []);
  const onSettled = useCallback((spinId: number) => {
    setSettledSpin(spinId);
    setAnimating(false);
    if (spunLive.current) {
      spunLive.current = false;
      setConfetti((c) => ({ n: c.n + 1, big: false }));
      sounds.wheelStop();
    }
  }, []);

  /* --------------------------------------------------------------- actions */

  const run = useCallback(
    async (name: string, args?: Record<string, unknown>): Promise<boolean> => {
      unlockAudio();
      setBusy(true);
      setNotice(null);
      try {
        const { data, error: rpcError } = await getBrowserClient().rpc(name, args);
        if (rpcError) {
          setNotice({ kind: "error", text: rpcError.message });
          return false;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (row && typeof row === "object" && "status" in row) applyState(row as AuctionState);
        return true;
      } finally {
        setBusy(false);
        void refresh();
      }
    },
    [applyState, refresh],
  );

  async function spin() {
    if (wheelPlayers.length === 0) return;
    // Winner is chosen first, with a secure random source; the wheel then animates to it.
    const winner = wheelPlayers[secureRandomInt(wheelPlayers.length)];
    await run("auction_select_player", { p_player_id: winner.id });
  }

  async function bringBackUnsold() {
    const before = unsoldCount;
    if (await run("auction_bring_back_unsold")) {
      setNotice({ kind: "info", text: `${before} unsold player${before === 1 ? "" : "s"} back on the wheel for round two.` });
    }
  }

  async function resetSport() {
    if (!sport) return;
    if (!window.confirm(`Reset the ${sport.name} auction? Every player goes back to Available, all bids are cleared and purses are restored.`)) return;
    await run("auction_reset_sport", { p_sport_id: sport.id });
  }

  function toggleFullscreen() {
    unlockAudio();
    setSoundOn(true);
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }

  /* ----------------------------------------------------------------- render */

  if (!snap || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        {error ? (
          <div className="card max-w-md p-6">
            <h1 className="font-display text-3xl font-bold uppercase">Can&apos;t load the auction</h1>
            <p className="mt-2 text-muted">{error}</p>
            <p className="mt-2 text-sm text-muted">
              Check that <code>supabase/auction.sql</code> has been run in your Supabase project.
            </p>
            <button type="button" onClick={() => void refresh()} className="btn-primary mt-4">Try again</button>
          </div>
        ) : (
          <p className="animate-pulse font-display text-3xl font-bold uppercase text-muted">Loading auction…</p>
        )}
      </div>
    );
  }

  const status = state.status;
  const showSelector = admin && (!sport || pickSport);
  const reveal = status === "spinning" && settledSpin === state.spin_id && currentPlayer;
  // Sports with several wheels (cricket) first ask which wheel to run.
  const needsPoolChoice = pools.length > 1 && !activePool && CAN_SPIN_FROM.includes(status);
  const nextPool = pools.find((p) => p.key !== activePool?.key && poolCount(p.key) > 0);
  const canSpin =
    admin && !!sport && !needsPoolChoice && CAN_SPIN_FROM.includes(status) && wheelPlayers.length > 0 && !busy && !animating;
  const currentBid = state.current_bid ?? snap.settings.base_price;
  const nextAmount = nextBidAmount(currentBid, snap.settings.increment_slabs);
  const teamCheck = (team: (typeof sportTeams)[number]) =>
    checkTeamBid({
      team,
      bought: boughtCount(team.id),
      squadSize,
      amount: nextAmount,
      basePrice: snap.settings.base_price,
      isHighest: team.id === state.highest_team_id,
    });

  // Keyboard: Space spin / start bidding · 1–4 bid · U undo · S sold · N unsold
  const actions: Record<string, () => void> = {};
  if (admin && sport && !busy) {
    if (soldView) {
      actions.space = () => setSoldView(null);
    } else {
      if (canSpin) actions.space = () => void spin();
      else if (reveal) actions.space = () => void run("auction_start_bidding");
      if (reveal) actions.n = () => void run("auction_unsold");
      if (status === "bidding") {
        sportTeams.slice(0, 9).forEach((team, i) => {
          if (teamCheck(team).ok) actions[String(i + 1)] = () => void run("auction_place_bid", { p_team_id: team.id, p_expected: nextAmount });
        });
        if (snap.bids.length > 0) actions.u = () => void run("auction_undo_bid");
        if (state.highest_team_id) actions.s = () => void run("auction_sold");
        if (snap.bids.length === 0) actions.n = () => void run("auction_unsold");
      }
      if (status === "sold" || status === "unsold") actions.u = () => void run("auction_undo_result");
    }
  }
  keyActions.current = actions;
  const soldTeam = soldView ? snap.teams.find((t) => t.id === soldView.teamId) : undefined;
  const soldPlayer = soldView ? snap.players.find((p) => p.id === soldView.playerId) : undefined;
  const lastTeam = snap.teams.find((t) => t.id === state.highest_team_id);

  return (
    <div className="min-h-screen" style={config ? accentStyle(config) : undefined}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <p className="font-display text-xl font-extrabold uppercase leading-none tracking-wide 2xl:text-3xl">MPL Live Auction</p>
              {config && sport && (
                <p className="text-sm font-semibold text-accent 2xl:text-lg">
                  {config.emoji} {sport.name}
                  {activePool ? ` · ${activePool.label} wheel` : ""} · squads of {squadSize}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", connected ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400")}
              title={connected ? "Live updates connected" : "Reconnecting – refreshing every few seconds"}
            >
              <span className={cn("h-2 w-2 rounded-full", connected ? "bg-emerald-500" : "animate-pulse bg-amber-500")} />
              {connected ? "Live" : "Reconnecting"}
            </span>
            <button
              type="button"
              onClick={() => {
                unlockAudio();
                setSoundOn(true);
                setMuted(!muted);
              }}
              className="btn-outline min-h-[40px] px-3"
              aria-pressed={muted}
              aria-label={muted ? "Unmute sounds" : "Mute sounds"}
            >
              {muted ? "🔇 Muted" : "🔊 Sound"}
            </button>
            {!admin && (
              <button type="button" onClick={toggleFullscreen} className="btn-primary min-h-[40px] px-3">
                {fullscreen ? "Exit full screen" : soundOn ? "⛶ Full screen" : "⛶ Full screen + sound"}
              </button>
            )}
            {admin && (
              <>
                {sport && (
                  <button type="button" disabled={busy || status === "spinning" || status === "bidding"} onClick={() => setPickSport((v) => !v)} className="btn-outline min-h-[40px] px-3">
                    Change sport
                  </button>
                )}
                <Link href="/auction/screen" target="_blank" className="btn-outline min-h-[40px] px-3">Projector view ↗</Link>
                <Link href="/admin/auction/settings" className="btn-outline min-h-[40px] px-3">Settings</Link>
                <Link href="/auction/summary" className="btn-outline hidden min-h-[40px] px-3 sm:inline-flex">Summary</Link>
              </>
            )}
            {!admin && <ThemeToggle />}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1800px] space-y-5 p-3 sm:p-5">
        {notice && (
          <div
            role={notice.kind === "error" ? "alert" : "status"}
            className={cn(
              "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-base font-medium",
              notice.kind === "error"
                ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
            )}
          >
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 font-bold">✕</button>
          </div>
        )}

        {showSelector ? (
          <SportSelector
            sports={snap.sports}
            players={snap.players}
            disabled={busy}
            onSelect={async (id) => {
              if (await run("auction_set_sport", { p_sport_id: id })) setPickSport(false);
            }}
          />
        ) : !sport || !config ? (
          <div className="card mx-auto mt-16 max-w-xl p-10 text-center">
            <p className="text-6xl" aria-hidden>🏆</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold uppercase">The auction will begin shortly</h1>
            <p className="mt-2 text-muted">This screen updates by itself as soon as the auctioneer picks a sport.</p>
          </div>
        ) : (
          <>
            {(() => {
              // Four teams -> one in each corner around the wheel. Any other count -> a strip below.
              const cornerLayout = sportTeams.length === 4;
              const showWheel =
                (!needsPoolChoice && (status === "idle" || status === "sold" || status === "unsold")) || (status === "spinning" && !reveal);

              const center = (
                <div className="space-y-4" aria-live="polite">
                  {needsPoolChoice && (
                    <PoolChooser
                      pools={pools}
                      counts={Object.fromEntries(pools.map((p) => [p.key, poolCount(p.key)]))}
                      admin={admin}
                      busy={busy}
                      onChoose={(key) => void run("auction_set_pool", { p_pool: key })}
                    />
                  )}
                  {showWheel && (
                    <>
                      {activePool && (
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide 2xl:text-5xl">
                            <span aria-hidden>{activePool.emoji}</span> {activePool.label} wheel
                          </h2>
                          {admin && (
                            <button
                              type="button"
                              disabled={busy || animating || status === "spinning"}
                              onClick={() => void run("auction_set_pool", { p_pool: "" })}
                              className="btn-outline min-h-[40px] px-3"
                            >
                              ⇄ Switch wheel
                            </button>
                          )}
                        </div>
                      )}

                      {/* Result of the last player, above the wheel */}
                      {(status === "sold" || status === "unsold") && currentPlayer && (
                        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-border bg-surface/70 px-4 py-2 text-center text-lg 2xl:text-2xl">
                          {status === "sold" ? (
                            <p>
                              <span className="font-display font-extrabold uppercase text-accent">Sold:</span>{" "}
                              <span className="font-semibold">{currentPlayer.name}</span> → {lastTeam?.name ?? "—"} for{" "}
                              <span className="font-display font-extrabold">{formatCompact(state.current_bid)}</span>
                            </p>
                          ) : (
                            <p className="text-muted">
                              <span className="font-display font-extrabold uppercase">Unsold:</span> {currentPlayer.name} – back in round two
                            </p>
                          )}
                          {admin && (
                            <button
                              type="button"
                              disabled={busy || animating}
                              onClick={() => void run("auction_undo_result")}
                              className="btn-outline min-h-[36px] px-3 py-1 text-sm"
                              title="Made a mistake? Put this player back"
                            >
                              ↶ Undo {status === "sold" ? "sale" : "unsold"} <Kbd>U</Kbd>
                            </button>
                          )}
                        </div>
                      )}

                      <SpinWheel
                        players={wheelPlayers}
                        targetId={status === "spinning" ? state.current_player_id : null}
                        spinId={state.spin_id}
                        animate={status === "spinning"}
                        ready
                        highlightId={status === "spinning" ? state.current_player_id : null}
                        emoji={activePool?.emoji ?? config.emoji}
                        palette={activePool?.palette}
                        onSpinStart={onSpinStart}
                        onSettled={onSettled}
                        onTick={sounds.tick}
                        onTap={canSpin ? spin : undefined}
                      />

                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <p className="text-lg font-semibold text-muted 2xl:text-2xl">
                          <span className="font-display text-3xl font-extrabold text-foreground 2xl:text-5xl">{wheelPlayers.length}</span> player
                          {wheelPlayers.length === 1 ? "" : "s"} on the wheel
                        </p>
                        {admin && (
                          <>
                            <button
                              type="button"
                              disabled={!canSpin}
                              onClick={spin}
                              className="btn min-h-[64px] min-w-[10rem] bg-accent px-8 font-display text-3xl font-extrabold uppercase tracking-widest text-slate-900 hover:brightness-110"
                            >
                              {animating ? "Spinning…" : (
                                <>
                                  Spin <Kbd className="text-base">Space</Kbd>
                                </>
                              )}
                            </button>
                            {unsoldCount > 0 && (
                              <button type="button" disabled={busy || animating || status === "spinning"} onClick={bringBackUnsold} className="btn-outline min-h-[56px]">
                                ↻ Bring back {unsoldCount} unsold
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      {admin && (
                        <p className="hidden text-center text-xs text-muted lg:block">
                          Shortcuts: <Kbd>Space</Kbd> spin / start bidding · <Kbd>1</Kbd>–<Kbd>4</Kbd> bid for that team · <Kbd>U</Kbd> undo ·{" "}
                          <Kbd>S</Kbd> sold · <Kbd>N</Kbd> unsold
                        </p>
                      )}
                      {!admin && status === "idle" && <p className="text-center text-lg text-muted">Next player coming up…</p>}
                      {!admin && unsoldCount > 0 && <p className="text-center text-muted">{unsoldCount} unsold – second round later</p>}
                      {wheelPlayers.length === 0 && status !== "spinning" && (
                        <div className="flex flex-wrap items-center justify-center gap-3 text-center text-lg font-semibold text-accent">
                          <p>
                            {activePool && nextPool
                              ? `${activePool.label} wheel done!`
                              : unsoldCount > 0
                                ? "First round complete!"
                                : `Every ${config.name} player has been auctioned!`}
                          </p>
                          {admin && activePool && nextPool && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void run("auction_set_pool", { p_pool: nextPool.key })}
                              className="btn-primary min-h-[44px]"
                            >
                              {nextPool.emoji} Go to the {nextPool.label} wheel
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Wheel stopped: the chosen player */}
                  {reveal && currentPlayer && (
                    <>
                      <PlayerReveal player={currentPlayer} config={config} basePrice={snap.settings.base_price} />
                      {admin && (
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run("auction_start_bidding")}
                            className="btn-primary col-span-2 min-h-[64px] text-xl"
                          >
                            Start Bidding <Kbd>Space</Kbd>
                          </button>
                          <button type="button" disabled={busy} onClick={() => void run("auction_unsold")} className="btn-danger min-h-[64px]">
                            Skip → Unsold <Kbd>N</Kbd>
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Bidding: current bid in the middle, bid buttons on the team corners */}
                  {status === "bidding" && currentPlayer && (
                    <>
                      <div className="card p-4 2xl:p-6">
                        <PlayerReveal player={currentPlayer} config={config} basePrice={snap.settings.base_price} compact />
                      </div>
                      <BiddingPanel
                        mode={mode}
                        state={state}
                        settings={snap.settings}
                        squadSize={squadSize}
                        teams={sportTeams}
                        boughtCount={boughtCount}
                        bids={snap.bids}
                        busy={busy}
                        teamButtons={!cornerLayout}
                        onBid={(teamId, expected) => void run("auction_place_bid", { p_team_id: teamId, p_expected: expected })}
                        onUndo={() => void run("auction_undo_bid")}
                        onSold={() => void run("auction_sold")}
                        onUnsold={() => void run("auction_unsold")}
                      />
                    </>
                  )}
                </div>
              );

              if (!cornerLayout) {
                return (
                  <>
                    <section aria-label="Auction" className="mx-auto max-w-4xl">{center}</section>
                    <TeamStrip teams={sportTeams} players={snap.players} squadSize={squadSize} highlightTeamId={status === "bidding" ? state.highest_team_id : null} />
                  </>
                );
              }

              return (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.3fr)_minmax(0,1fr)] lg:grid-rows-2 2xl:gap-6">
                  <section aria-label="Auction" className="col-span-2 lg:col-span-1 lg:col-start-2 lg:row-span-2 lg:row-start-1">
                    {center}
                  </section>
                  {sportTeams.map((team, i) => {
                    const isHolder = status === "bidding" && team.id === state.highest_team_id;
                    return (
                      <div key={team.id} className={CORNERS[i]}>
                        <TeamCorner
                          team={team}
                          bought={boughtCount(team.id)}
                          squadSize={squadSize}
                          isHolder={isHolder}
                          canBid={admin && status === "bidding"}
                          nextAmount={nextAmount}
                          check={teamCheck(team)}
                          shortcut={admin ? String(i + 1) : undefined}
                          busy={busy}
                          onBid={() => void run("auction_place_bid", { p_team_id: team.id, p_expected: nextAmount })}
                          onOpenSquad={() => setSquadTeamId(team.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {admin && (
              <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
                <button type="button" disabled={busy} onClick={resetSport} className="btn-danger min-h-[40px] px-3 text-xs">
                  Reset {sport.name} auction (testing)
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {squadTeamId !== null &&
        (() => {
          const team = snap.teams.find((t) => t.id === squadTeamId);
          return team ? (
            <SquadDialog
              team={team}
              squad={snap.players.filter((p) => p.team_id === team.id && p.status === "sold")}
              squadSize={squadSize}
              onClose={() => setSquadTeamId(null)}
            />
          ) : null;
        })()}
      {soldView && soldPlayer && soldTeam && (
        <SoldOverlay player={soldPlayer} team={soldTeam} price={soldView.price} onClose={() => setSoldView(null)} />
      )}
      <Confetti burst={confetti.n} big={confetti.big} />
    </div>
  );
}
