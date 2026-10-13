"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/format";
import { exportStore, importStore, resetStore, runAction } from "@/lib/local-auction";
import type { AuctionSettings, Sport } from "@/lib/types";
import { useAuctionSnapshot } from "@/lib/use-auction";

const LAKH = 100_000;

interface Row {
  /** Upper limit in lakh, "" for the last (open-ended) slab. */
  upTo: string;
  step: string;
}

/** Whole rupees from a lakh amount typed by the user (handles 0.5, 2.5 ...). */
const toRupees = (lakh: string) => Math.round(Number(lakh) * LAKH);
const toLakh = (rupees: number) => String(rupees / LAKH);

type FormState = { error?: string; saved?: boolean } | undefined;

/** Settings and backup for the auction saved in this browser. */
export function SettingsForm() {
  const snap = useAuctionSnapshot();
  if (!snap) return <p className="animate-pulse text-muted">Loading…</p>;
  // Re-mount the form when a backup is restored, so it shows the restored values.
  return (
    <div className="space-y-8">
      <Form key={JSON.stringify([snap.settings, snap.sports])} settings={snap.settings} sports={snap.sports} />
      <Backup />
    </div>
  );
}

function Form({ settings, sports }: { settings: AuctionSettings; sports: Sport[] }) {
  const [state, setState] = useState<FormState>(undefined);
  const [basePrice, setBasePrice] = useState(toLakh(settings.base_price));
  const [rows, setRows] = useState<Row[]>(
    settings.increment_slabs.map((s) => ({ upTo: s.up_to === null ? "" : toLakh(s.up_to), step: toLakh(s.step) })),
  );
  const [squads, setSquads] = useState<Record<number, string>>(Object.fromEntries(sports.map((s) => [s.id, String(s.squad_size)])));

  function save(e: FormEvent) {
    e.preventDefault();
    try {
      runAction("auction_save_settings", {
        p_base_price: toRupees(basePrice),
        p_slabs: rows.map((r, i) => ({ up_to: i === rows.length - 1 ? null : toRupees(r.upTo), step: toRupees(r.step) })),
        p_squads: Object.fromEntries(Object.entries(squads).map(([id, v]) => [id, Number(v)])),
      });
      setState({ saved: true });
    } catch (err) {
      setState({ error: err instanceof Error ? err.message : "Could not save the settings." });
    }
  }

  const setRow = (i: number, patch: Partial<Row>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const lastIndex = rows.length - 1;

  return (
    <form onSubmit={save} className="space-y-8">

      {state?.error && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state?.saved && (
        <p role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          Settings saved.
        </p>
      )}

      <section className="card p-4 sm:p-6">
        <h2 className="section-title mb-1">Base price</h2>
        <p className="mb-4 text-sm text-muted">Starting bid for every player.</p>
        <label htmlFor="base" className="label">Base price (₹ lakh)</label>
        <div className="flex items-center gap-3">
          <input id="base" type="number" min={0.01} step={0.01} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="input max-w-[12rem]" />
          <span className="text-muted">= {formatPrice(toRupees(basePrice) || 0)}</span>
        </div>
      </section>

      <section className="card p-4 sm:p-6">
        <h2 className="section-title mb-1">Bid increments</h2>
        <p className="mb-4 text-sm text-muted">
          Only used for a bid placed without an amount; on the auction screen each bid is set with − / + (₹1 lakh) or typed in. A slab applies while the current bid is below its limit; the last slab covers everything above.
        </p>
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
              <div>
                <label className="label" htmlFor={`upto-${i}`}>{i === lastIndex ? "Above the previous limit" : "While bid is below (₹ lakh)"}</label>
                <input
                  id={`upto-${i}`}
                  type="number"
                  min={0}
                  step={0.5}
                  value={i === lastIndex ? "" : row.upTo}
                  disabled={i === lastIndex}
                  placeholder={i === lastIndex ? "no limit" : ""}
                  onChange={(e) => setRow(i, { upTo: e.target.value })}
                  className="input disabled:opacity-60"
                />
              </div>
              <div>
                <label className="label" htmlFor={`step-${i}`}>Step (₹ lakh)</label>
                <input id={`step-${i}`} type="number" min={0.01} step={0.5} value={row.step} onChange={(e) => setRow(i, { step: e.target.value })} className="input" />
              </div>
              <button
                type="button"
                className="btn-outline min-h-[44px] px-3"
                disabled={rows.length <= 1}
                aria-label={`Remove slab ${i + 1}`}
                onClick={() => setRows((all) => all.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn-outline mt-4"
          onClick={() =>
            setRows((all) => {
              // New slab goes before the open-ended one.
              const copy = [...all];
              const prevLimit = Number(copy[copy.length - 2]?.upTo ?? 0);
              copy.splice(copy.length - 1, 0, { upTo: String(prevLimit + 50), step: copy[copy.length - 1].step });
              return copy;
            })
          }
        >
          + Add slab
        </button>
      </section>

      <section className="card p-4 sm:p-6">
        <h2 className="section-title mb-1">Squad size</h2>
        <p className="mb-4 text-sm text-muted">Players each team must buy, per sport. Teams stop bidding once their squad is full.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {sports.map((sport) => (
            <div key={sport.id}>
              <label className="label" htmlFor={`squad-${sport.id}`}>{sport.name}</label>
              <input
                id={`squad-${sport.id}`}
                type="number"
                min={1}
                max={50}
                step={1}
                value={squads[sport.id]}
                onChange={(e) => setSquads((all) => ({ ...all, [sport.id]: e.target.value }))}
                className="input"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary">Save settings</button>
        <Link href="/auction" className="btn-outline">Back to auction</Link>
      </div>
    </form>
  );
}

/** The auction lives in this browser only: download a copy now and then, and restore it on another laptop if needed. */
function Backup() {
  const file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  function download() {
    const url = URL.createObjectURL(new Blob([exportStore()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `mpl-auction-backup-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function restore(f: File | undefined) {
    if (!f) return;
    if (!window.confirm("Replace the auction in this browser with the backup? Everything not in the backup is lost.")) return;
    try {
      importStore(await f.text());
      setMessage({ kind: "info", text: "Backup restored." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not read that file." });
    } finally {
      if (file.current) file.current.value = "";
    }
  }

  function reset() {
    if (!window.confirm("Reset the whole auction? Every result, bid and setting in this browser is wiped.")) return;
    resetStore();
    setMessage({ kind: "info", text: "Auction reset." });
  }

  return (
    <section className="card p-4 sm:p-6">
      <h2 className="section-title mb-1">Backup</h2>
      <p className="mb-4 text-sm text-muted">
        Results, bids and settings are saved in this browser only. Run the auction and the projector screen from the same
        browser, and download a backup during breaks. To move to another laptop, restore the backup there.
      </p>
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={
            message.kind === "error"
              ? "mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
              : "mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
          }
        >
          {message.text}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={download} className="btn-primary">Download backup</button>
        <button type="button" onClick={() => file.current?.click()} className="btn-outline">Restore from backup</button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void restore(e.target.files?.[0])} />
        <button type="button" onClick={reset} className="btn-danger">Reset whole auction</button>
      </div>
    </section>
  );
}
