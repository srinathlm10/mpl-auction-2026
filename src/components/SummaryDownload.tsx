"use client";

export interface SummaryRow {
  sport: string;
  player: string;
  batch: string;
  role: string;
  status: string;
  team: string;
  basePrice: number;
  soldPrice: number | null;
}

const HEADERS = ["Sport", "Player", "Batch", "Role / Position", "Status", "Team", "Base price", "Sold price"];

function cell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Builds the CSV in the browser and downloads it (opens cleanly in Excel). */
export function SummaryDownload({ rows, filename }: { rows: SummaryRow[]; filename: string }) {
  function download() {
    const lines = [
      HEADERS.join(","),
      ...rows.map((r) => [r.sport, r.player, r.batch, r.role, r.status, r.team, r.basePrice, r.soldPrice].map(cell).join(",")),
    ];
    // BOM so Excel reads the file as UTF-8
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={download} disabled={rows.length === 0} className="btn-primary">
      ⬇ Download CSV ({rows.length})
    </button>
  );
}
