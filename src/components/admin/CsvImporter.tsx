"use client";

import Papa from "papaparse";
import { useMemo, useState, useTransition } from "react";
import { importPlayers, type ImportResult } from "@/app/admin/actions";
import { parsePlayerRows, type CsvRow } from "@/lib/csv";
import { formatPrice } from "@/lib/format";
import type { Sport } from "@/lib/types";

export function CsvImporter({ sports }: { sports: Sport[] }) {
  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const preview = useMemo(() => (rows ? parsePlayerRows(rows, sports) : null), [rows, sports]);
  const sportName = (id: number) => sports.find((s) => s.id === id)?.name ?? "?";

  function onFile(file: File | undefined) {
    setResult(null);
    setParseError("");
    setRows(null);
    if (!file) return;
    setFileName(file.name);
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (res) => {
        if (res.data.length === 0) setParseError("No data rows found in this file.");
        else setRows(res.data);
      },
      error: (err) => setParseError(err.message),
    });
  }

  function runImport() {
    if (!rows) return;
    startTransition(async () => {
      const outcome = await importPlayers(rows);
      setResult(outcome);
      if (!outcome.fatal) setRows(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="card p-4 sm:p-6">
        <label htmlFor="csv" className="label">CSV file</label>
        <input
          id="csv"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
        />
        <p className="mt-2 text-xs text-muted">
          Required columns: <code>name, sport, batch, role_or_position, base_price</code>. Optional: <code>photo_url</code> and
          skill ratings such as <code>skill_batting</code>. <a href="/sample-players.csv" download className="font-semibold text-primary hover:underline">Download a template</a>.
        </p>
        {parseError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{parseError}</p>}
      </div>

      {result && (
        <div role="status" className={`card p-4 ${result.fatal ? "border-red-500/50" : "border-emerald-500/50"}`}>
          {result.fatal ? (
            <p className="font-semibold text-red-600 dark:text-red-400">{result.fatal}</p>
          ) : (
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">
              Imported {result.inserted} player{result.inserted === 1 ? "" : "s"}.
              {result.errors.length > 0 && ` ${result.errors.length} row(s) were skipped.`}
            </p>
          )}
        </div>
      )}

      {preview && rows && (
        <div className="card p-4 sm:p-6">
          <h2 className="font-display text-2xl font-bold uppercase">Preview – {fileName}</h2>
          <p className="mt-1 text-sm text-muted">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">{preview.valid.length} ready to import</span>
            {preview.errors.length > 0 && <>, <span className="font-semibold text-red-600 dark:text-red-400">{preview.errors.length} with problems (will be skipped)</span></>}
          </p>

          {preview.errors.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-xl bg-red-500/10 p-3 text-sm">
              {preview.errors.slice(0, 20).map((e) => (
                <li key={e.row}>Row {e.row}: {e.message}</li>
              ))}
              {preview.errors.length > 20 && <li>…and {preview.errors.length - 20} more</li>}
            </ul>
          )}

          {preview.valid.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr><th className="py-2 pr-3">Name</th><th className="pr-3">Sport</th><th className="pr-3">Batch</th><th className="pr-3">Role</th><th className="text-right">Base</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.valid.slice(0, 10).map((p, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-3 font-semibold">{p.name}</td>
                      <td className="pr-3">{sportName(p.sport_id)}</td>
                      <td className="pr-3">{p.batch}</td>
                      <td className="pr-3">{p.role_or_position}</td>
                      <td className="text-right">{formatPrice(p.base_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.valid.length > 10 && <p className="mt-2 text-xs text-muted">Showing the first 10 of {preview.valid.length}.</p>}
            </div>
          )}

          <button type="button" onClick={runImport} disabled={pending || preview.valid.length === 0} className="btn-primary mt-5">
            {pending ? "Importing…" : `Import ${preview.valid.length} player${preview.valid.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </div>
  );
}
