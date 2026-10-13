"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BiddingPanel } from "@/components/auction/BiddingPanel";
import { Confetti } from "@/components/auction/Confetti";
import { PlayerReveal } from "@/components/auction/PlayerReveal";
import { SoldOverlay } from "@/components/auction/SoldOverlay";
import { SpinWheel } from "@/components/auction/SpinWheel";
import { SportSelector } from "@/components/auction/SportSelector";
import { TeamStrip } from "@/components/auction/TeamStrip";
import { Logo } from "@/components/ui/Logo";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { secureRandomInt } from "@/lib/random";
import { cn, formatCompact, formatPrice } from "@/lib/format";
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
  const [soundOn, setSoundOn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const spunLive = useRef(false);
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
  const activePool = pools.find((p) => p.key === state?.pool) ?? pools[0];
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
  const canSpin = admin && !!sport && CAN_SPIN_FROM.includes(status) && wheelPlayers.length > 0 && !busy && !animating;
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
                <Link href="/auction" target="_blank" className="btn-outline min-h-[40px] px-3">Projector view ↗</Link>
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
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] 2xl:gap-8">
              {/* Wheel */}
              <section aria-label="Player wheel" className="space-y-4">
                {pools.length > 1 && (
                  <div role="tablist" aria-label="Wheels" className="flex flex-wrap justify-center gap-2">
                    {pools.map((pool) => {
                      const active = pool.key === activePool?.key;
                      const cls = cn(
                        "inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 px-5 font-display text-xl font-bold uppercase tracking-wide transition 2xl:text-3xl",
                        active ? "border-accent bg-accent text-slate-900" : "border-border bg-surface text-muted",
                      );
                      const label = (
                        <>
                          {pool.label}
                          <span className={cn("rounded-full px-2 text-base", active ? "bg-slate-900/15" : "bg-border")}>{poolCount(pool.key)}</span>
                        </>
                      );
                      return admin ? (
                        <button
                          key={pool.key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          disabled={!active && (busy || animating || status === "spinning" || status === "bidding")}
                          onClick={() => !active && void run("auction_set_pool", { p_pool: pool.key })}
                          className={cn(cls, !active && "hover:border-accent hover:text-foreground disabled:opacity-50")}
                        >
                          {label}
                        </button>
                      ) : (
                        <span key={pool.key} role="tab" aria-selected={active} className={cls}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
                <SpinWheel
                  players={wheelPlayers}
                  targetId={status === "spinning" || status === "bidding" ? state.current_player_id : null}
                  spinId={state.spin_id}
                  animate={status === "spinning"}
                  ready
                  highlightId={status === "spinning" || status === "bidding" ? state.current_player_id : null}
                  emoji={config.emoji}
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
                        {animating ? "Spinning…" : "Spin"}
                      </button>
                      {unsoldCount > 0 && (
                        <button type="button" disabled={busy || animating || status === "spinning" || status === "bidding"} onClick={bringBackUnsold} className="btn-outline min-h-[56px]">
                          ↻ Bring back {unsoldCount} unsold
                        </button>
                      )}
                    </>
                  )}
                </div>
                {!admin && unsoldCount > 0 && (
                  <p className="text-center text-muted">{unsoldCount} unsold – second round later</p>
                )}
                {wheelPlayers.length === 0 && status !== "spinning" && status !== "bidding" && (
                  <p className="text-center text-lg font-semibold text-accent">
                    {(() => {
                      const next = pools.find((p) => p.key !== activePool?.key && poolCount(p.key) > 0);
                      if (activePool && next) return `${activePool.label} wheel done – switch to the ${next.label} wheel.`;
                      return unsoldCount > 0 ? "First round complete!" : `Every ${config.name} player has been auctioned!`;
                    })()}
                  </p>
                )}
              </section>

              {/* Right-hand panel */}
              <section aria-label="Current player" className="space-y-4" aria-live="polite">
                {status === "idle" && (
                  <div className="card p-10 text-center 2xl:p-16">
                    <p className="text-6xl" aria-hidden>{config.emoji}</p>
                    <h2 className="mt-3 font-display text-4xl font-extrabold uppercase 2xl:text-6xl">
                      {admin ? "Ready when you are" : "Next player coming up"}
                    </h2>
                    <p className="mt-2 text-lg text-muted 2xl:text-2xl">
                      {admin ? "Press Spin or tap the wheel to pick the next player." : "The wheel is about to spin…"}
                    </p>
                  </div>
                )}

                {status === "spinning" && !reveal && (
                  <div className="card p-10 text-center 2xl:p-16">
                    <p className="animate-spin text-6xl" aria-hidden>{config.emoji}</p>
                    <h2 className="mt-4 font-display text-4xl font-extrabold uppercase 2xl:text-6xl">Spinning…</h2>
                  </div>
                )}

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
                          Start Bidding
                        </button>
                        <button type="button" disabled={busy} onClick={() => void run("auction_unsold")} className="btn-danger min-h-[64px]">
                          Skip → Unsold
                        </button>
                      </div>
                    )}
                  </>
                )}

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
                      onBid={(teamId, expected) => void run("auction_place_bid", { p_team_id: teamId, p_expected: expected })}
                      onUndo={() => void run("auction_undo_bid")}
                      onSold={() => void run("auction_sold")}
                      onUnsold={() => void run("auction_unsold")}
                    />
                  </>
                )}

                {status === "sold" && currentPlayer && (
                  <div className="card border-accent/60 p-6 text-center 2xl:p-10">
                    <p className="font-display text-6xl font-extrabold uppercase text-accent 2xl:text-8xl">Sold!</p>
                    <div className="mx-auto mt-4 flex max-w-md items-center gap-4 text-left">
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-border 2xl:h-32 2xl:w-28">
                        <PlayerAvatar name={currentPlayer.name} src={currentPlayer.photo_url} sizes="112px" className="text-2xl" />
                      </div>
                      <div>
                        <p className="font-display text-3xl font-extrabold uppercase 2xl:text-5xl">{currentPlayer.name}</p>
                        <p className="text-lg text-muted 2xl:text-2xl">to {lastTeam?.name ?? "—"}</p>
                        <p className="font-display text-4xl font-extrabold 2xl:text-6xl">{formatCompact(state.current_bid)}</p>
                        <p className="text-sm text-muted">{formatPrice(state.current_bid)}</p>
                      </div>
                    </div>
                    {admin && <p className="mt-4 text-muted">Spin the wheel for the next player.</p>}
                  </div>
                )}

                {status === "unsold" && currentPlayer && (
                  <div className="card p-8 text-center 2xl:p-12">
                    <p className="font-display text-5xl font-extrabold uppercase text-muted 2xl:text-7xl">Unsold</p>
                    <p className="mt-2 font-display text-3xl font-bold uppercase 2xl:text-5xl">{currentPlayer.name}</p>
                    <p className="mt-2 text-muted">Removed from the wheel. They can return in round two.</p>
                  </div>
                )}
              </section>
            </div>

            {/* Team strip */}
            <TeamStrip teams={sportTeams} players={snap.players} squadSize={squadSize} highlightTeamId={status === "bidding" ? state.highest_team_id : null} />

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

      {soldView && soldPlayer && soldTeam && (
        <SoldOverlay player={soldPlayer} team={soldTeam} price={soldView.price} onClose={() => setSoldView(null)} />
      )}
      <Confetti burst={confetti.n} big={confetti.big} />
    </div>
  );
}
